using System.IO.Compression;
using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Harbor.Deployment.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;

namespace Harbor.Deployment.Tests;

public class GitHubActionsClientTests
{
    private readonly Mock<HttpMessageHandler> _httpHandlerMock = new(MockBehavior.Strict);
    private readonly Mock<ILogger<GitHubActionsClient>> _loggerMock = new();
    private readonly IOptions<GitHubActionsOptions> _options = Options.Create(new GitHubActionsOptions());
    private readonly HttpClient _httpClient;
    private readonly GitHubActionsClient _client;

    public GitHubActionsClientTests()
    {
        _httpClient = new HttpClient(_httpHandlerMock.Object)
        {
            BaseAddress = new Uri("https://api.github.com/")
        };
        _client = new GitHubActionsClient(_httpClient, _options, _loggerMock.Object);
    }

    [Fact]
    public async Task DispatchAsync_MissingInstallationToken_ReturnsFailure()
    {
        var request = new WorkflowDispatchRequest("owner", "repo", "deploy.yml", "main", new Dictionary<string, string>(), null);

        var result = await _client.DispatchAsync(request);

        Assert.False(result.Succeeded);
        Assert.Contains("no installation token is available", result.Error);
    }

    [Fact]
    public async Task DispatchAsync_PreFlightWorkflowCheck404_ReturnsFailure404()
    {
        var request = new WorkflowDispatchRequest("owner", "repo", "deploy.yml", "main", new Dictionary<string, string>(), "token-123");

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Get && m.RequestUri!.ToString().Contains("actions/workflows/deploy.yml")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent("{\"message\":\"Not Found\"}")
            });

        var result = await _client.DispatchAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(404, result.HttpStatus);
        Assert.Contains("Push 'deploy.yml' to the default branch", result.Error);
    }

    [Fact]
    public async Task DispatchAsync_Success_ReturnsSucceeded204()
    {
        var request = new WorkflowDispatchRequest("owner", "repo", "deploy.yml", "main", new Dictionary<string, string>(), "token-123");

        // Preflight check succeeds
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Get && m.RequestUri!.ToString().Contains("actions/workflows/deploy.yml")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Dispatch post succeeds
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Post && m.RequestUri!.ToString().Contains("actions/workflows/deploy.yml/dispatches")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.NoContent));

        var result = await _client.DispatchAsync(request);

        Assert.True(result.Succeeded);
        Assert.Equal(204, result.HttpStatus);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound, 404, "must exist on the repository's default branch")]
    [InlineData(HttpStatusCode.UnprocessableEntity, 422, "the branch or commit ref 'main' does not exist")]
    [InlineData(HttpStatusCode.Forbidden, 403, "Actions: write")]
    [InlineData(HttpStatusCode.BadGateway, 502, "GitHub rejected the workflow trigger")]
    public async Task DispatchAsync_DispatchFailures_ReturnsFriendlyError(HttpStatusCode statusCode, int expectedCode, string errorFragment)
    {
        var request = new WorkflowDispatchRequest("owner", "repo", "deploy.yml", "main", new Dictionary<string, string>(), "token-123");

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Get),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Post),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent("{\"message\":\"Custom error message\"}")
            });

        var result = await _client.DispatchAsync(request);

        Assert.False(result.Succeeded);
        Assert.Equal(expectedCode, result.HttpStatus);
        Assert.Contains(errorFragment, result.Error);
    }

    [Fact]
    public async Task GetCiStatusAsync_AllChecksPassing_ReturnsPassing()
    {
        var json = JsonSerializer.Serialize(new
        {
            check_runs = new[]
            {
                new { status = "completed", conclusion = "success" },
                new { status = "completed", conclusion = "skipped" }
            }
        });

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Get && m.RequestUri!.ToString().Contains("check-runs")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var result = await _client.GetCiStatusAsync("owner", "repo", "main", "token-123");

        Assert.Equal("passing", result.Status);
    }

    [Fact]
    public async Task GetCiStatusAsync_InProgressCheck_ReturnsPending()
    {
        var json = JsonSerializer.Serialize(new
        {
            check_runs = new[]
            {
                new { status = "completed", conclusion = "success" },
                new { status = "in_progress", conclusion = "" }
            }
        });

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var result = await _client.GetCiStatusAsync("owner", "repo", "main", "token-123");

        Assert.Equal("pending", result.Status);
    }

    [Fact]
    public async Task GetCiStatusAsync_FailingCheck_ReturnsFailing()
    {
        var json = JsonSerializer.Serialize(new
        {
            check_runs = new[]
            {
                new { status = "completed", conclusion = "failure" }
            }
        });

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var result = await _client.GetCiStatusAsync("owner", "repo", "main", "token-123");

        Assert.Equal("failing", result.Status);
    }

    [Fact]
    public async Task GetCiStatusAsync_NoChecks_ReturnsUnknown()
    {
        var json = JsonSerializer.Serialize(new { check_runs = Array.Empty<object>() });

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var result = await _client.GetCiStatusAsync("owner", "repo", "main", "token-123");

        Assert.Equal("unknown", result.Status);
        Assert.Contains("No CI checks found", result.Summary);
    }

    [Fact]
    public async Task GetCiStatusAsync_HttpError_ReturnsUnknown()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.BadGateway));

        var result = await _client.GetCiStatusAsync("owner", "repo", "main", "token-123");

        Assert.Equal("unknown", result.Status);
    }

    [Fact]
    public async Task FetchRunLogsAsync_ValidZip_ReturnsConcatenatedLogs()
    {
        // Build a zip in memory with 2 log text files
        using var zipMs = new MemoryStream();
        using (var archive = new ZipArchive(zipMs, ZipArchiveMode.Create, true))
        {
            var entry1 = archive.CreateEntry("01_build.txt");
            using (var writer = new StreamWriter(entry1.Open()))
                writer.WriteLine("Build succeeded");

            var entry2 = archive.CreateEntry("02_test.txt");
            using (var writer = new StreamWriter(entry2.Open()))
                writer.WriteLine("Tests passed 100%");
        }
        zipMs.Position = 0;

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(m => m.Method == HttpMethod.Get && m.RequestUri!.ToString().Contains("/actions/runs/123/logs")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(zipMs.ToArray())
            });

        var logs = await _client.FetchRunLogsAsync("owner", "repo", 123, "token-123");

        Assert.NotNull(logs);
        Assert.Contains("Build succeeded", logs);
        Assert.Contains("Tests passed 100%", logs);
    }

    [Fact]
    public async Task FetchRunLogsAsync_NonSuccess_ReturnsNull()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.NotFound));

        var logs = await _client.FetchRunLogsAsync("owner", "repo", 999, "token-123");

        Assert.Null(logs);
    }
}
