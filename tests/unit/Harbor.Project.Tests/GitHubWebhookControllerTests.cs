using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Harbor.GitHub;
using Harbor.Project.Controllers;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class GitHubWebhookControllerTests
{
    private readonly GitHubAppOptions _options = new()
    {
        WebhookSecret = "super-secret-webhook-key"
    };
    private readonly Mock<ILogger<GitHubWebhookController>> _loggerMock = new();
    private readonly GitHubWebhookController _controller;

    public GitHubWebhookControllerTests()
    {
        _controller = new GitHubWebhookController(Options.Create(_options), _loggerMock.Object);
    }

    private void SetHttpContext(string eventType, string bodyJson, bool validSignature = true)
    {
        var bodyBytes = Encoding.UTF8.GetBytes(bodyJson);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-GitHub-Event"] = eventType;
        httpContext.Request.Headers["X-GitHub-Delivery"] = Guid.NewGuid().ToString();
        httpContext.Request.Body = new MemoryStream(bodyBytes);

        if (validSignature)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.WebhookSecret));
            var hash = Convert.ToHexString(hmac.ComputeHash(bodyBytes)).ToLowerInvariant();
            httpContext.Request.Headers["X-Hub-Signature-256"] = $"sha256={hash}";
        }
        else
        {
            httpContext.Request.Headers["X-Hub-Signature-256"] = "sha256=invalidhash00000000000000000000000000000000000000000000000000000000";
        }

        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task HandleGitHubWebhook_InvalidSignature_ReturnsUnauthorized()
    {
        SetHttpContext("ping", "{}", validSignature: false);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_PingEvent_ReturnsOk()
    {
        SetHttpContext("ping", "{\"zen\":\"Keep it logically awesome.\"}");

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_InstallationEvent_ReturnsOk()
    {
        var json = JsonSerializer.Serialize(new
        {
            action = "created",
            installation = new
            {
                id = 123456L,
                account = new { login = "test-user", type = "User" }
            }
        });
        SetHttpContext("installation", json);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_InstallationRepositoriesEvent_ReturnsOk()
    {
        var json = JsonSerializer.Serialize(new
        {
            action = "added",
            installation = new { id = 123456L },
            repositories = new[] { new { id = 1, name = "repo-1" } },
            repository_selection = "selected"
        });
        SetHttpContext("installation_repositories", json);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_WorkflowRunEvent_ReturnsOk()
    {
        var json = JsonSerializer.Serialize(new
        {
            action = "completed",
            workflow_run = new
            {
                name = "Deploy",
                status = "completed",
                conclusion = "success",
                head_branch = "main"
            }
        });
        SetHttpContext("workflow_run", json);

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
    }

    [Fact]
    public async Task HandleGitHubWebhook_UnknownEvent_ReturnsOk()
    {
        SetHttpContext("star", "{\"action\":\"created\"}");

        var result = await _controller.HandleGitHubWebhook();

        Assert.IsType<OkResult>(result);
    }
}
