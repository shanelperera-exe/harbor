using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Services;

public sealed record WorkflowDispatchRequest(
    string Owner,
    string Repository,
    string WorkflowFile,
    string Ref,
    IReadOnlyDictionary<string, string> Inputs,
    string? InstallationToken = null);

public sealed record WorkflowDispatchResult(bool Succeeded, string? Error, int? HttpStatus = null);

/// <summary>Result of a CI check before deployment.</summary>
/// <param name="Status">"passing", "failing", "pending", or "unknown"</param>
public sealed record CiCheckResult(string Status, string? Summary = null);

public interface IGitHubActionsClient
{
    Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Polls the GitHub API after a workflow_dispatch to find the newly created run.
    /// Returns (runId, runUrl) or null if not found within timeoutSeconds.
    /// </summary>
    Task<(long RunId, string RunUrl)?> PollForRunAsync(string owner, string repository, string workflowFile, string installationToken, DateTime dispatchedAt, int timeoutSeconds = 30, CancellationToken cancellationToken = default);

    /// <summary>Checks the latest CI run status on a branch/SHA. Used to gate deployments.</summary>
    Task<CiCheckResult> GetCiStatusAsync(string owner, string repository, string gitRef, string installationToken, CancellationToken cancellationToken = default);

    /// <summary>Downloads and returns the raw log text for a workflow run. Returns null on failure.</summary>
    Task<string?> FetchRunLogsAsync(string owner, string repository, long runId, string installationToken, CancellationToken cancellationToken = default);
}

public sealed class GitHubActionsClient(HttpClient httpClient, IOptions<GitHubActionsOptions> options, ILogger<GitHubActionsClient> logger) : IGitHubActionsClient
{
    private readonly GitHubActionsOptions _options = options.Value;

    public async Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default)
    {
        var token = request.InstallationToken;
        if (string.IsNullOrWhiteSpace(token))
            return new(false, "GitHub Actions is not configured: no installation token is available. Ensure the GitHub App is installed and the account is linked.");

        // ── Pre-flight: verify the workflow file is accessible from the default branch ──────────
        // GitHub only dispatches workflows that exist on the repo's default branch.
        // A 204 response with no resulting run means the file exists on a feature branch only.
        var workflowCheckUrl = $"repos/{Uri.EscapeDataString(request.Owner)}/{Uri.EscapeDataString(request.Repository)}/actions/workflows/{Uri.EscapeDataString(request.WorkflowFile)}";
        using var checkMsg = new HttpRequestMessage(HttpMethod.Get, workflowCheckUrl);
        checkMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        checkMsg.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        checkMsg.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

        try
        {
            using var checkResp = await httpClient.SendAsync(checkMsg, cancellationToken);
            if (checkResp.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                var checkDetail = await checkResp.Content.ReadAsStringAsync(cancellationToken);
                logger.LogWarning(
                    "Workflow pre-flight check: '{WorkflowFile}' not found in {Owner}/{Repo}. " +
                    "The file must exist on the repository's default branch (e.g. main). GitHub response: {Detail}",
                    request.WorkflowFile, request.Owner, request.Repository, checkDetail);

                // Hard stop — do NOT proceed. GitHub would return 204 but silently do nothing,
                // which would leave the deployment permanently stuck as "Running".
                return new(false,
                    $"Workflow file '{request.WorkflowFile}' was not found in {request.Owner}/{request.Repository}. " +
                    $"GitHub requires the workflow to exist on the repository's default branch (usually 'main') " +
                    $"to be dispatchable. Push '{request.WorkflowFile}' to the default branch and redeploy.",
                    404);
            }
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "Workflow pre-flight check request failed; proceeding with dispatch attempt.");
            // Non-fatal network error on the check itself — proceed with dispatch
        }

        // ── Dispatch ──────────────────────────────────────────────────────────────────────────────
        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            $"repos/{Uri.EscapeDataString(request.Owner)}/{Uri.EscapeDataString(request.Repository)}/actions/workflows/{Uri.EscapeDataString(request.WorkflowFile)}/dispatches");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        message.Headers.Add("X-GitHub-Api-Version", "2022-11-28");
        message.Content = JsonContent.Create(new { @ref = request.Ref, inputs = request.Inputs });

        try
        {
            using var response = await httpClient.SendAsync(message, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation(
                    "Workflow '{WorkflowFile}' dispatched successfully for {Owner}/{Repo} at ref '{Ref}'.",
                    request.WorkflowFile, request.Owner, request.Repository, request.Ref);
                return new(true, null, (int)response.StatusCode);
            }

            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            var statusCode = (int)response.StatusCode;

            // Try to extract GitHub's message from the JSON body
            string? githubMessage = null;
            try
            {
                using var doc = JsonDocument.Parse(detail);
                githubMessage = doc.RootElement.TryGetProperty("message", out var msgEl) ? msgEl.GetString() : null;
            }
            catch { /* ignore parse errors */ }

            var friendlyError = statusCode switch
            {
                404 => $"GitHub returned 404 — the workflow '{request.WorkflowFile}' must exist on the repository's default branch (e.g. main) to be dispatchable. Push it to the default branch and retry.",
                422 => $"GitHub returned 422 — the branch or commit ref '{request.Ref}' does not exist in {request.Owner}/{request.Repository}, or the workflow does not have a 'workflow_dispatch' trigger.",
                403 => $"GitHub returned 403 — the Harbor GitHub App installation does not have 'Actions: write' permission. Update the app's permissions at github.com/settings/apps/harbordev.",
                _ => githubMessage is not null
                    ? $"GitHub rejected the workflow trigger ({statusCode}): {githubMessage}"
                    : $"GitHub rejected the workflow trigger ({statusCode} {response.ReasonPhrase})."
            };

            logger.LogWarning(
                "GitHub workflow dispatch failed {StatusCode} for {WorkflowFile} in {Owner}/{Repo} at ref '{Ref}': {Detail}",
                statusCode, request.WorkflowFile, request.Owner, request.Repository, request.Ref, detail);

            return new(false, friendlyError, statusCode);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "GitHub workflow dispatch HTTP request failed for {WorkflowFile} in {Owner}/{Repo}.", request.WorkflowFile, request.Owner, request.Repository);
            return new(false, "GitHub could not be reached while triggering the workflow. Check your network connectivity.", null);
        }
    }

    /// <inheritdoc/>
    public async Task<(long RunId, string RunUrl)?> PollForRunAsync(
        string owner, string repository, string workflowFile, string installationToken,
        DateTime dispatchedAt, int timeoutSeconds = 30, CancellationToken cancellationToken = default)
    {
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);
        var createdAfter = dispatchedAt.AddSeconds(-5).ToString("yyyy-MM-ddTHH:mm:ssZ");
        var runsUrl = $"repos/{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repository)}/actions/workflows/{Uri.EscapeDataString(workflowFile)}/runs?event=workflow_dispatch&created=%3E%3D{Uri.EscapeDataString(createdAfter)}&per_page=5";

        await Task.Delay(TimeSpan.FromSeconds(4), cancellationToken);

        while (DateTime.UtcNow < deadline && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, runsUrl);
                req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", installationToken);
                req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
                req.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

                using var resp = await httpClient.SendAsync(req, cancellationToken);
                if (resp.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(cancellationToken));
                    if (doc.RootElement.TryGetProperty("workflow_runs", out var runs) && runs.GetArrayLength() > 0)
                    {
                        var runId = runs[0].GetProperty("id").GetInt64();
                        var runUrl = runs[0].TryGetProperty("html_url", out var urlEl) ? urlEl.GetString() ?? string.Empty : string.Empty;
                        logger.LogInformation("Captured workflow run ID {RunId} for {WorkflowFile} in {Owner}/{Repo}.", runId, workflowFile, owner, repository);
                        return (runId, runUrl);
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Error polling for workflow run; will retry.");
            }

            await Task.Delay(TimeSpan.FromSeconds(3), cancellationToken);
        }

        logger.LogWarning("Could not capture workflow run for {WorkflowFile} in {Owner}/{Repo} within {Timeout}s.", workflowFile, owner, repository, timeoutSeconds);
        return null;
    }

    /// <inheritdoc/>
    public async Task<CiCheckResult> GetCiStatusAsync(
        string owner, string repository, string gitRef, string installationToken,
        CancellationToken cancellationToken = default)
    {
        // Query the GitHub Checks API for the latest check runs on this ref
        var url = $"repos/{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repository)}/commits/{Uri.EscapeDataString(gitRef)}/check-runs?per_page=20&filter=latest";
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", installationToken);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            req.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            using var resp = await httpClient.SendAsync(req, cancellationToken);
            if (!resp.IsSuccessStatusCode)
                return new CiCheckResult("unknown", "Could not retrieve CI status from GitHub.");

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync(cancellationToken));
            if (!doc.RootElement.TryGetProperty("check_runs", out var checkRuns) || checkRuns.GetArrayLength() == 0)
                return new CiCheckResult("unknown", "No CI checks found for this branch.");

            var statuses = new List<string>();
            var conclusions = new List<string>();
            foreach (var run in checkRuns.EnumerateArray())
            {
                var status = run.TryGetProperty("status", out var s) ? s.GetString() ?? "" : "";
                var conclusion = run.TryGetProperty("conclusion", out var c) ? c.GetString() ?? "" : "";
                statuses.Add(status);
                if (!string.IsNullOrEmpty(conclusion)) conclusions.Add(conclusion);
            }

            // If any run is still in progress → pending
            if (statuses.Any(s => s is "queued" or "in_progress"))
                return new CiCheckResult("pending", "CI checks are still running.");

            // If any conclusion is failure → failing
            if (conclusions.Any(c => c is "failure" or "timed_out" or "cancelled"))
                return new CiCheckResult("failing", "One or more CI checks have failed.");

            // All passed
            if (conclusions.Count > 0 && conclusions.All(c => c is "success" or "skipped" or "neutral"))
                return new CiCheckResult("passing", "All CI checks passed.");

            return new CiCheckResult("unknown", "CI check status could not be determined.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Failed to fetch CI status for {Owner}/{Repo}@{Ref}.", owner, repository, gitRef);
            return new CiCheckResult("unknown", "Could not reach GitHub to verify CI status.");
        }
    }

    /// <inheritdoc/>
    public async Task<string?> FetchRunLogsAsync(
        string owner, string repository, long runId, string installationToken,
        CancellationToken cancellationToken = default)
    {
        // GitHub returns a redirect to a ZIP download — follow it
        var url = $"repos/{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repository)}/actions/runs/{runId}/logs";
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", installationToken);
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
            req.Headers.Add("X-GitHub-Api-Version", "2022-11-28");

            using var resp = await httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (!resp.IsSuccessStatusCode) return null;

            // Unzip in-memory and concatenate all log files
            using var zipStream = await resp.Content.ReadAsStreamAsync(cancellationToken);
            using var archive = new System.IO.Compression.ZipArchive(zipStream, System.IO.Compression.ZipArchiveMode.Read);
            var sb = new System.Text.StringBuilder();
            // Sort entries so logs appear in job order
            foreach (var entry in archive.Entries.OrderBy(e => e.FullName))
            {
                if (!entry.Name.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)) continue;
                sb.AppendLine($"=== {entry.FullName} ===");
                using var reader = new System.IO.StreamReader(entry.Open());
                sb.AppendLine(await reader.ReadToEndAsync(cancellationToken));
            }
            return sb.Length > 0 ? sb.ToString() : null;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Failed to fetch logs for run {RunId} in {Owner}/{Repo}.", runId, owner, repository);
            return null;
        }
    }
}
