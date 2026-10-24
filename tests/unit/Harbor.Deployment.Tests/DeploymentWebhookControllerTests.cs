using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Harbor.Deployment.Controllers;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

[Collection("WebhookSecretCollection")]
public class DeploymentWebhookControllerTests
{
    private readonly Mock<IDeploymentRepository> _repoMock = new();
    private readonly Mock<IGitHubActionsClient> _clientMock = new();
    private readonly Mock<IInstallationTokenResolver> _tokenResolverMock = new();
    private readonly Mock<ILogger<DeploymentWebhookController>> _loggerMock = new();
    private readonly Mock<ICloudProviderSyncService> _cloudSyncMock = new();

    private readonly DeploymentWebhookController _controller;

    public DeploymentWebhookControllerTests()
    {
        _controller = new DeploymentWebhookController(
            _repoMock.Object,
            _clientMock.Object,
            _tokenResolverMock.Object,
            _loggerMock.Object,
            _cloudSyncMock.Object);
    }

    private void SetHttpContext(string eventType, string bodyJson, string? secret = null, bool sendValidSignature = true)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(bodyJson);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-GitHub-Event"] = eventType;
        httpContext.Request.Headers["X-GitHub-Delivery"] = Guid.NewGuid().ToString();
        httpContext.Request.Body = new MemoryStream(bodyBytes);

        if (!string.IsNullOrEmpty(secret))
        {
            Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", secret);
            if (sendValidSignature)
            {
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
                var hash = Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLowerInvariant();
                httpContext.Request.Headers["X-Hub-Signature-256"] = $"sha256={hash}";
            }
            else
            {
                httpContext.Request.Headers["X-Hub-Signature-256"] = "sha256=invalidhash00000000000000000000000000000000000000000000000000000000";
            }
        }
        else
        {
            Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", null);
            Environment.SetEnvironmentVariable("GITHUB_APP_WEBHOOK_SECRET", null);
        }

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    [Fact]
    public async Task HandleGitHubWebhook_InvalidSignature_ReturnsUnauthorized()
    {
        SetHttpContext("workflow_run", "{}", secret: "my-secret", sendValidSignature: false);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_NonWorkflowRunEvent_ReturnsOk()
    {
        SetHttpContext("push", "{\"ref\":\"refs/heads/main\"}");

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.GetByWorkflowRunIdAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_MissingWorkflowRunObject_ReturnsOk()
    {
        SetHttpContext("workflow_run", "{\"action\":\"completed\"}");

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.GetByWorkflowRunIdAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_RunIdZero_ReturnsOk()
    {
        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new { id = 0 }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.GetByWorkflowRunIdAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_DeploymentMatch_ActionNotCompleted_DoesNotUpdateStatus()
    {
        const long runId = 12345;
        var deployment = new DeploymentEntity
        {
            Id = 50,
            OwnerId = 1,
            ServiceId = 10,
            Environment = "Staging",
            Status = "Triggered"
        };
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync(deployment);

        var body = JsonSerializer.Serialize(new
        {
            action = "in_progress",
            workflow_run = new
            {
                id = runId,
                name = "Deploy",
                status = "in_progress",
                conclusion = (string?)null
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.UpdateTriggerResultAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_DeploymentMatch_UnknownConclusion_DoesNotUpdateStatus()
    {
        const long runId = 12345;
        var deployment = new DeploymentEntity
        {
            Id = 50,
            OwnerId = 1,
            ServiceId = 10,
            Environment = "Staging",
            Status = "Triggered"
        };
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync(deployment);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new
            {
                id = runId,
                name = "Deploy",
                conclusion = "action_required"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.UpdateTriggerResultAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>()), Times.Never);
    }

    [Theory]
    [InlineData("failure")]
    [InlineData("cancelled")]
    [InlineData("timed_out")]
    [InlineData("skipped")]
    public async Task HandleGitHubWebhook_DeploymentMatch_FailureConclusions_SetsFailedStatus(string conclusion)
    {
        const long runId = 555;
        var deployment = new DeploymentEntity
        {
            Id = 88,
            OwnerId = 1,
            ServiceId = 10,
            Environment = "Staging",
            Status = "Running"
        };
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync(deployment);
        _repoMock.Setup(r => r.UpdateTriggerResultAsync(deployment.Id, "Failed", It.IsAny<string?>(), null))
            .ReturnsAsync(true);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new
            {
                id = runId,
                name = "Deploy",
                conclusion = conclusion
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.UpdateTriggerResultAsync(deployment.Id, "Failed", It.Is<string>(s => s.Contains(conclusion)), null), Times.Once);
    }

    [Fact]
    public async Task HandleGitHubWebhook_DeploymentMatch_Success_Production_ExtractsLogsAndSyncsUrl()
    {
        const long runId = 777;
        var deployment = new DeploymentEntity
        {
            Id = 101,
            OwnerId = 2,
            ServiceId = 15,
            Environment = "Production",
            Status = "Running",
            CommitSha = "abc1234"
        };

        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync(deployment);
        _repoMock.Setup(r => r.UpdateTriggerResultAsync(deployment.Id, "Succeeded", null, null)).ReturnsAsync(true);
        _tokenResolverMock.Setup(t => t.GetInstallationTokenAsync(deployment.OwnerId)).ReturnsAsync("token-xyz");
        _repoMock.Setup(r => r.GetRepositoryNameAsync(deployment.ServiceId)).ReturnsAsync("owner/my-service");

        var logText = "Deployment complete! Live at https://myservice.vercel.app ready!";
        _clientMock.Setup(c => c.FetchRunLogsAsync("owner", "my-service", runId, "token-xyz", It.IsAny<CancellationToken>()))
            .ReturnsAsync(logText);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new
            {
                id = runId,
                name = "Deploy to Vercel",
                conclusion = "success"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.UpdateTriggerResultAsync(deployment.Id, "Succeeded", null, null), Times.Once);

        // Allow background Task.Run to finish
        await Task.Delay(200);

        _repoMock.Verify(r => r.AddLogsAsync(deployment.Id, logText), Times.Once);
        _repoMock.Verify(r => r.UpdateDeploymentUrlAsync(deployment.Id, "https://myservice.vercel.app"), Times.Once);
        _repoMock.Verify(r => r.UpdateServiceDeploymentUrlAsync(deployment.ServiceId, "https://myservice.vercel.app"), Times.Once);
    }

    [Fact]
    public async Task HandleGitHubWebhook_CiRun_NoRepo_Ignored()
    {
        const long runId = 999;
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync((DeploymentEntity?)null);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new
            {
                id = runId,
                name = "CI"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.GetServiceByRepositoryAsync(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_CiRun_ServiceNotFound_Ignored()
    {
        const long runId = 999;
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync((DeploymentEntity?)null);
        _repoMock.Setup(r => r.GetServiceByRepositoryAsync("org/unknown-repo")).ReturnsAsync(((int?, int?)?)null);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            repository = new { full_name = "org/unknown-repo" },
            workflow_run = new
            {
                id = runId,
                name = "CI"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.GetCiRunByGitHubRunIdAsync(It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task HandleGitHubWebhook_CiRun_NewRecord_Created()
    {
        const long runId = 12399;
        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync((DeploymentEntity?)null);
        _repoMock.Setup(r => r.GetServiceByRepositoryAsync("org/my-repo")).ReturnsAsync((10, 2));
        _repoMock.Setup(r => r.GetCiRunByGitHubRunIdAsync(runId)).ReturnsAsync((CiRunEntity?)null);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            repository = new { full_name = "org/my-repo" },
            workflow_run = new
            {
                id = runId,
                name = "Build & Test",
                path = ".github/workflows/ci.yml",
                head_branch = "feature-x",
                head_sha = "deadbeef",
                status = "completed",
                conclusion = "success",
                html_url = "https://github.com/org/my-repo/actions/runs/12399"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.CreateCiRunAsync(It.Is<CiRunEntity>(ci =>
            ci.ServiceId == 10 &&
            ci.OwnerId == 2 &&
            ci.WorkflowName == "Build & Test" &&
            ci.WorkflowFile == "ci.yml" &&
            ci.Branch == "feature-x" &&
            ci.CommitSha == "deadbeef" &&
            ci.Conclusion == "success" &&
            ci.Status == "completed" &&
            ci.GitHubRunId == runId)), Times.Once);
    }

    [Fact]
    public async Task HandleGitHubWebhook_CiRun_ExistingRecord_Updated()
    {
        const long runId = 8888;
        var existingCiRun = new CiRunEntity
        {
            Id = 44,
            ServiceId = 10,
            OwnerId = 2,
            Status = "in_progress"
        };

        _repoMock.Setup(r => r.GetByWorkflowRunIdAsync(runId)).ReturnsAsync((DeploymentEntity?)null);
        _repoMock.Setup(r => r.GetServiceByRepositoryAsync("org/my-repo")).ReturnsAsync((10, 2));
        _repoMock.Setup(r => r.GetCiRunByGitHubRunIdAsync(runId)).ReturnsAsync(existingCiRun);

        var body = JsonSerializer.Serialize(new
        {
            action = "completed",
            repository = new { full_name = "org/my-repo" },
            workflow_run = new
            {
                id = runId,
                name = "CI Test",
                path = ".github/workflows/test.yml",
                head_branch = "main",
                head_sha = "123abc456",
                conclusion = "success"
            }
        });
        SetHttpContext("workflow_run", body);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
        _repoMock.Verify(r => r.UpdateCiRunAsync(It.Is<CiRunEntity>(ci =>
            ci.Id == 44 &&
            ci.Conclusion == "success" &&
            ci.Status == "completed")), Times.Once);
    }
}
