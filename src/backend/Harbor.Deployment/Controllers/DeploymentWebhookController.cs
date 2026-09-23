using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

/// <summary>
/// Receives GitHub App webhook events (workflow_run completed) and updates deployment status.
/// No secrets need to be stored in the user's repository — Harbor receives these events
/// automatically because the GitHub App is installed on the user's account.
/// </summary>
[ApiController]
[Route("api/deployments/webhooks")]
public sealed class DeploymentWebhookController(
    IDeploymentRepository repository,
    IGitHubActionsClient gitHubActionsClient,
    IInstallationTokenResolver? installationTokenResolver,
    ILogger<DeploymentWebhookController> logger) : ControllerBase
{
    [HttpPost("github")]
    public async Task<IActionResult> HandleGitHubWebhook()
    {
        var eventType = Request.Headers["X-GitHub-Event"].ToString();
        var signature = Request.Headers["X-Hub-Signature-256"].ToString();
        var deliveryId = Request.Headers["X-GitHub-Delivery"].ToString();

        // Read body once
        using var ms = new MemoryStream();
        await Request.Body.CopyToAsync(ms);
        var rawBody = ms.ToArray();

        // Verify HMAC-SHA256 signature using the configured webhook secret
        var webhookSecret = Environment.GetEnvironmentVariable("GITHUB_APP_WEBHOOK_SECRET");
        if (!string.IsNullOrWhiteSpace(webhookSecret))
        {
            if (!VerifySignature(rawBody, signature, webhookSecret))
            {
                logger.LogWarning("Deployment webhook: signature verification failed (event={Event}, delivery={Delivery})", eventType, deliveryId);
                return Unauthorized();
            }
        }
        else
        {
            logger.LogWarning("GITHUB_APP_WEBHOOK_SECRET is not configured — skipping signature verification.");
        }

        logger.LogDebug("Deployment webhook received: event={Event}, delivery={Delivery}", eventType, deliveryId);

        if (!string.Equals(eventType, "workflow_run", StringComparison.OrdinalIgnoreCase))
            return Ok(); // We only care about workflow_run events

        using var payload = JsonDocument.Parse(rawBody);
        await HandleWorkflowRunAsync(payload.RootElement);
        return Ok();
    }

    private async Task HandleWorkflowRunAsync(JsonElement payload)
    {
        var action = payload.TryGetProperty("action", out var a) ? a.GetString() : null;
        var run = payload.TryGetProperty("workflow_run", out var r) ? r : default(JsonElement);

        if (run.ValueKind == JsonValueKind.Undefined) return;

        var runId = run.TryGetProperty("id", out var rid) ? rid.GetInt64() : 0L;
        var conclusion = run.TryGetProperty("conclusion", out var c) ? c.GetString() : null;
        var workflowName = run.TryGetProperty("name", out var wn) ? wn.GetString() ?? "?" : "?";
        var workflowPath = run.TryGetProperty("path", out var p) ? p.GetString() : null;
        var workflowFile = !string.IsNullOrWhiteSpace(workflowPath) ? Path.GetFileName(workflowPath) ?? workflowName : workflowName;
        var headBranch = run.TryGetProperty("head_branch", out var hb) ? hb.GetString() ?? "?" : "?";
        var headSha = run.TryGetProperty("head_sha", out var sha) ? sha.GetString() : null;
        var runStatus = run.TryGetProperty("status", out var s) ? s.GetString() : null;
        var htmlUrl = run.TryGetProperty("html_url", out var ul) ? ul.GetString() : null;
        var createdAt = run.TryGetProperty("created_at", out var ca) ? ca.GetDateTime() : DateTime.UtcNow;
        var updatedAt = run.TryGetProperty("updated_at", out var ua) ? (ua.ValueKind == JsonValueKind.Null ? null : (DateTime?)ua.GetDateTime()) : null;

        if (runId == 0) return;

        logger.LogInformation(
            "workflow_run action={Action}: runId={RunId}, workflow={Workflow}, status={RunStatus}, conclusion={Conclusion}, branch={Branch}",
            action, runId, workflowName, runStatus, conclusion, headBranch);

        // ── Try to match this run to an existing deployment ──────────────────────
        var deployment = await repository.GetByWorkflowRunIdAsync(runId);
        if (deployment is not null)
        {
            await HandleDeploymentRunAsync(deployment, action, conclusion, workflowName, headBranch, runId);
            return;
        }

        // ── No deployment found — check if this is a CI run we should track ──────
        await HandleCiRunAsync(
            runId, action, conclusion, runStatus, workflowName, workflowFile,
            headBranch, headSha, htmlUrl, createdAt, updatedAt, payload);
    }

    private async Task HandleDeploymentRunAsync(
        DeploymentEntity deployment, string? action, string? conclusion,
        string workflowName, string headBranch, long runId)
    {
        // We only update deployment status when a run completes
        if (!string.Equals(action, "completed", StringComparison.OrdinalIgnoreCase)) return;

        var newStatus = conclusion?.ToLowerInvariant() switch
        {
            "success" => "Succeeded",
            "failure" => "Failed",
            "cancelled" => "Failed",
            "timed_out" => "Failed",
            "skipped" => "Failed",
            _ => null
        };

        if (newStatus is null)
        {
            logger.LogWarning("Unknown workflow_run conclusion '{Conclusion}' for deployment {Id} — not updating.", conclusion, deployment.Id);
            return;
        }

        var failureReason = newStatus == "Failed"
            ? $"GitHub Actions workflow '{workflowName}' concluded as '{conclusion}'. Check the Actions tab on GitHub for details."
            : null;

        var updated = await repository.UpdateTriggerResultAsync(deployment.Id, newStatus, failureReason, null);
        if (updated)
            logger.LogInformation("Deployment {Id} updated to {Status} via workflow_run webhook (runId={RunId}).", deployment.Id, newStatus, runId);
        else
            logger.LogWarning("Failed to update deployment {Id} status via webhook.", deployment.Id);

        // ── Background: fetch GitHub Actions logs and store them ────────────────
        if (updated && deployment.OwnerId > 0)
        {
            var captureDeploymentId = deployment.Id;
            var captureOwnerId = deployment.OwnerId;
            var captureRunId = runId;
            _ = Task.Run(async () =>
            {
                try
                {
                    var token = await installationTokenResolver?.GetInstallationTokenAsync(captureOwnerId);
                    if (string.IsNullOrWhiteSpace(token)) return;

                    var repoName = await repository.GetRepositoryNameAsync(deployment.ServiceId);
                    if (string.IsNullOrWhiteSpace(repoName) || !repoName.Contains('/')) return;
                    var parts = repoName.Split('/', 2);

                    var logText = await gitHubActionsClient.FetchRunLogsAsync(parts[0], parts[1], captureRunId, token);
                    if (!string.IsNullOrWhiteSpace(logText))
                        await repository.AddLogsAsync(captureDeploymentId, logText);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to fetch logs for deployment {Id}.", captureDeploymentId);
                }
            });
        }
    }

    private async Task HandleCiRunAsync(
        long runId, string? action, string? conclusion, string? runStatus,
        string workflowName, string workflowFile, string headBranch, string? headSha,
        string? htmlUrl, DateTime createdAt, DateTime? updatedAt, JsonElement payload)
    {
        // Resolve the GitHub repository full_name from the payload
        var repoFullName = payload.TryGetProperty("repository", out var repo)
            && repo.TryGetProperty("full_name", out var fn)
                ? fn.GetString()
                : null;

        if (string.IsNullOrWhiteSpace(repoFullName))
        {
            logger.LogDebug("workflow_run has no repository full_name — cannot track as CI run.");
            return;
        }

        // Find the Harbor service that maps to this GitHub repository
        var serviceInfo = await repository.GetServiceByRepositoryAsync(repoFullName);
        if (!serviceInfo.HasValue)
        {
            logger.LogDebug("No Harbor service found for repository '{Repo}' — ignoring as CI run.", repoFullName);
            return;
        }

        var serviceId = serviceInfo.Value.ServiceId!.Value;
        var ownerId = serviceInfo.Value.OwnerId!.Value;

        // Determine the GitHub status for this action
        var ciStatus = action?.ToLowerInvariant() switch
        {
            "in_progress" => "in_progress",
            "requested" => "queued",
            "completed" => "completed",
            _ => runStatus ?? "unknown"
        };

        try
        {
            // Try to find an existing CI run record for this GitHub run ID
            var existing = await repository.GetCiRunByGitHubRunIdAsync(runId);

            if (existing is not null)
            {
                // Update the existing record with the latest status/conclusion
                var updated = new CiRunEntity
                {
                    Id = existing.Id,
                    ServiceId = existing.ServiceId,
                    OwnerId = existing.OwnerId,
                    WorkflowName = workflowName,
                    WorkflowFile = workflowFile,
                    Branch = headBranch,
                    CommitSha = headSha,
                    Conclusion = conclusion,
                    Status = ciStatus,
                    GitHubRunId = runId,
                    GitHubRunUrl = htmlUrl,
                    StartedAt = existing.StartedAt,
                    CompletedAt = string.Equals(action, "completed", StringComparison.OrdinalIgnoreCase) ? updatedAt : existing.CompletedAt,
                };
                await repository.UpdateCiRunAsync(updated);
                logger.LogDebug("Updated CI run record {CiRunId} for run {RunId} (status={Status}).", existing.Id, runId, ciStatus);
            }
            else
            {
                // Create a new CI run record
                var ciRun = new CiRunEntity
                {
                    ServiceId = serviceId,
                    OwnerId = ownerId,
                    WorkflowName = workflowName,
                    WorkflowFile = workflowFile,
                    Branch = headBranch,
                    CommitSha = headSha,
                    Conclusion = conclusion,
                    Status = ciStatus,
                    GitHubRunId = runId,
                    GitHubRunUrl = htmlUrl,
                    StartedAt = createdAt,
                    CompletedAt = string.Equals(action, "completed", StringComparison.OrdinalIgnoreCase) ? updatedAt : null,
                };
                await repository.CreateCiRunAsync(ciRun);
                logger.LogInformation("Created CI run record for GitHub run {RunId} on {Repo} (workflow={Workflow}, status={Status}).", runId, repoFullName, workflowName, ciStatus);
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to track CI run for runId={RunId}, repo={Repo}.", runId, repoFullName);
        }
    }

    private static bool VerifySignature(byte[] body, string signature, string secret)
    {
        if (string.IsNullOrWhiteSpace(signature) || !signature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
            return false;

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var computed = Convert.ToHexString(hmac.ComputeHash(body)).ToLowerInvariant();
        var provided = signature[7..].ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(computed),
            Encoding.ASCII.GetBytes(provided));
    }
}
