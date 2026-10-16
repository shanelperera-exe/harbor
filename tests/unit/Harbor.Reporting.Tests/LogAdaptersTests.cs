using System.Net;
using Harbor.Reporting.Adapters;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using Xunit;

namespace Harbor.Reporting.Tests;

public class LogAdaptersTests
{
    private readonly Mock<IHttpClientFactory> _clientFactoryMock = new();
    private readonly Mock<HttpMessageHandler> _httpHandlerMock = new(MockBehavior.Strict);
    private readonly HttpClient _httpClient;

    public LogAdaptersTests()
    {
        _httpClient = new HttpClient(_httpHandlerMock.Object);
        _clientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(_httpClient);
    }

    [Fact]
    public async Task DockerLogAdapter_Success_ReturnsConnectedLog()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new DockerLogAdapter(Mock.Of<ILogger<DockerLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "http://localhost:2375", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Docker", adapter.ProviderName);
        Assert.Contains(logs, l => l.Message.Contains("Connected to Docker daemon"));
    }

    [Fact]
    public async Task DockerLogAdapter_Exception_ReturnsErrorLog()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Connection refused"));

        var adapter = new DockerLogAdapter(Mock.Of<ILogger<DockerLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Contains(logs, l => l.Level == "error");
    }

    [Fact]
    public async Task VercelLogAdapter_Success_ReturnsReadyLog()
    {
        var json = """
            {
                "deployments": [
                    {
                        "name": "my-app",
                        "state": "READY",
                        "url": "my-app.vercel.app",
                        "uid": "dpl_12345",
                        "target": "production"
                    }
                ]
            }
            """;

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var adapter = new VercelLogAdapter(Mock.Of<ILogger<VercelLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "token-xyz", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Vercel", adapter.ProviderName);
        Assert.Contains(logs, l => l.Level == "[success]" && l.Message.Contains("Active PRODUCTION deployment"));
    }

    [Fact]
    public async Task VercelLogAdapter_EmptyDeployments_ReturnsNoDeploymentsLog()
    {
        var json = "{\"deployments\": []}";

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(json)
            });

        var adapter = new VercelLogAdapter(Mock.Of<ILogger<VercelLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "token-xyz", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Contains(logs, l => l.Message.Contains("Connected, but no deployments"));
    }

    [Fact]
    public async Task AwsLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new AwsLogAdapter(Mock.Of<ILogger<AwsLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "aws-key", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("AWS", adapter.ProviderName);
    }

    [Fact]
    public async Task AzureLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new AzureLogAdapter(Mock.Of<ILogger<AzureLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "azure-token", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Azure", adapter.ProviderName);
    }

    [Fact]
    public async Task DigitalOceanLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new DigitalOceanLogAdapter(Mock.Of<ILogger<DigitalOceanLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "do-pat", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("DigitalOcean", adapter.ProviderName);
    }

    [Fact]
    public async Task GcpLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new GcpLogAdapter(Mock.Of<ILogger<GcpLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "gcp-key", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("GCP", adapter.ProviderName);
    }

    [Fact]
    public async Task KubernetesLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new KubernetesLogAdapter(Mock.Of<ILogger<KubernetesLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "k8s-token", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Kubernetes", adapter.ProviderName);
    }

    [Fact]
    public async Task RenderLogAdapter_Success_ReturnsLogs()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        var adapter = new RenderLogAdapter(Mock.Of<ILogger<RenderLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "rnd_123", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Render", adapter.ProviderName);
    }

    [Fact]
    public async Task RailwayLogAdapter_Success_ReturnsLogs()
    {
        var json = """
        {
          "data": {
            "me": {
              "id": "user-railway-1",
              "name": "Railway Engineer",
              "email": "engineer@example.com",
              "projects": {
                "edges": [
                  {
                    "node": {
                      "id": "proj-abc",
                      "name": "Production App"
                    }
                  }
                ]
              }
            }
          }
        }
        """;

        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(json)
            });

        var adapter = new RailwayLogAdapter(Mock.Of<ILogger<RailwayLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "rlw_token", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Equal("Railway", adapter.ProviderName);
        Assert.Contains(logs, l => l.Message.Contains("Railway Engineer"));
    }

    [Fact]
    public async Task RailwayLogAdapter_Unauthorized_ReturnsErrorLog()
    {
        _httpHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized));

        var adapter = new RailwayLogAdapter(Mock.Of<ILogger<RailwayLogAdapter>>(), _clientFactoryMock.Object);
        var logs = await adapter.FetchLatestLogsAsync("svc-1", "bad_token", CancellationToken.None);

        Assert.NotEmpty(logs);
        Assert.Contains(logs, l => l.Level == "error");
    }
}
