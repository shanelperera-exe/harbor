using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/projects/githubintegration/webhooks")]
    public class GitHubWebhookController : ControllerBase
    {
        private readonly GitHubAppOptions _options;
        private readonly ILogger<GitHubWebhookController> _logger;

        public GitHubWebhookController(IOptions<GitHubAppOptions> options, ILogger<GitHubWebhookController> logger)
        {
            _options = options.Value;
            _logger = logger;
        }

        [HttpPost("github")]
        public async Task<IActionResult> HandleGitHubWebhook()
        {
            var signature = Request.Headers["X-Hub-Signature-256"].ToString();
            var eventType = Request.Headers["X-GitHub-Event"].ToString();
            var deliveryId = Request.Headers["X-GitHub-Delivery"].ToString();

            using var bodyStream = new MemoryStream();
            await Request.Body.CopyToAsync(bodyStream);
            bodyStream.Position = 0;

            var verified = VerifySignature(bodyStream, signature, _options.WebhookSecret);
            if (!verified)
            {
                _logger.LogWarning("GitHub webhook signature verification failed. Event: {EventType}, DeliveryId: {DeliveryId}", eventType, deliveryId);
                return Unauthorized();
            }

            bodyStream.Position = 0;
            var body = await JsonSerializer.DeserializeAsync<JsonElement>(bodyStream);

            _logger.LogInformation("Received GitHub webhook event: {EventType} (DeliveryId: {DeliveryId})", eventType, deliveryId);

            switch (eventType.ToLowerInvariant())
            {
                case "ping":
                    _logger.LogInformation("GitHub App ping received — webhook is active.");
                    break;

                case "installation":
                    await HandleInstallationEvent(body);
                    break;

                case "installation_repositories":
                    await HandleInstallationRepositoriesEvent(body);
                    break;

                case "workflow_run":
                    await HandleWorkflowRunEvent(body);
                    break;

                default:
                    _logger.LogDebug("Unhandled GitHub webhook event type: {EventType}", eventType);
                    break;
            }

            return Ok();
        }

        private bool VerifySignature(Stream bodyStream, string signature, string secret)
        {
            if (string.IsNullOrWhiteSpace(signature) || string.IsNullOrWhiteSpace(secret))
                return false;

            if (!signature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
                return false;

            var signatureHex = signature.Substring(7);

            using var hmac = new HMACSHA256(System.Text.Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(bodyStream);
            var computedHex = Convert.ToHexString(hash).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.ASCII.GetBytes(signatureHex),
                System.Text.Encoding.ASCII.GetBytes(computedHex));
        }

        private Task HandleInstallationEvent(JsonElement payload)
        {
            var action = payload.GetProperty("action").GetString();
            var installation = payload.GetProperty("installation");
            var installationId = installation.GetProperty("id").GetInt64();

            var account = installation.GetProperty("account");
            var accountLogin = account.GetProperty("login").GetString();
            var accountType = account.TryGetProperty("type", out var t) ? t.GetString() : "User";

            _logger.LogInformation(
                "GitHub installation event: action={Action}, installation={InstallationId}, account={AccountLogin} ({AccountType})",
                action, installationId, accountLogin, accountType);

            return Task.CompletedTask;
        }

        private Task HandleInstallationRepositoriesEvent(JsonElement payload)
        {
            var action = payload.GetProperty("action").GetString();
            var installation = payload.GetProperty("installation");
            var installationId = installation.GetProperty("id").GetInt64();

            var repositories = payload.GetProperty("repositories").GetArrayLength();
            var repoSelection = payload.TryGetProperty("repository_selection", out var rs) ? rs.GetString() : "all";

            _logger.LogInformation(
                "GitHub installation_repositories event: action={Action}, installation={InstallationId}, repositories={RepoCount}, selection={RepoSelection}",
                action, installationId, repositories, repoSelection);

            return Task.CompletedTask;
        }

        private Task HandleWorkflowRunEvent(JsonElement payload)
        {
            var action = payload.GetProperty("action").GetString();
            var workflowRun = payload.GetProperty("workflow_run");

            var workflowName = workflowRun.TryGetProperty("name", out var wn) ? wn.GetString() : "unknown";
            var status = workflowRun.TryGetProperty("status", out var s) ? s.GetString() : "unknown";
            var conclusion = workflowRun.TryGetProperty("conclusion", out var c) ? c.GetString() : "none";
            var headBranch = workflowRun.TryGetProperty("head_branch", out var hb) ? hb.GetString() : "unknown";

            _logger.LogInformation(
                "GitHub workflow_run event: action={Action}, workflow={WorkflowName}, status={Status}, conclusion={Conclusion}, branch={HeadBranch}",
                action, workflowName, status, conclusion, headBranch);

            return Task.CompletedTask;
        }
    }
}
