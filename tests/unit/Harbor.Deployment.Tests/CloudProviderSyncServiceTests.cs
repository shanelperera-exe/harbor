using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Harbor.Common.Security;
using Harbor.Deployment.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using Xunit;

namespace Harbor.Deployment.Tests;

public class CloudProviderSyncServiceTests
{
    private readonly Mock<IHarborSecretProtector> _secretProtectorMock;
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;

    public CloudProviderSyncServiceTests()
    {
        _secretProtectorMock = new Mock<IHarborSecretProtector>();
        _secretProtectorMock.Setup(s => s.Unprotect(It.IsAny<string>())).Returns<string>(s => s);

        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_VercelMatchesCommitSha_ReturnsMatchedUrl()
    {
        var targetCommit = "abc1234";
        var expectedUrl = "https://portfolio-deploy-1.vercel.app";

        var responseJson = JsonSerializer.Serialize(new
        {
            deployments = new[]
            {
                new
                {
                    url = "portfolio-deploy-old.vercel.app",
                    meta = new { githubCommitSha = "other_sha" }
                },
                new
                {
                    url = "portfolio-deploy-1.vercel.app",
                    meta = new { githubCommitSha = targetCommit }
                }
            }
        });

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseJson)
            });

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Vercel", "test_token", targetCommit);

        Assert.Equal(expectedUrl, result);
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_VercelNoCommitMatch_ReturnsLatestDeploymentUrl()
    {
        var expectedUrl = "https://portfolio-latest.vercel.app";

        var responseJson = JsonSerializer.Serialize(new
        {
            deployments = new[]
            {
                new
                {
                    url = "portfolio-latest.vercel.app",
                    meta = new { githubCommitSha = "sha1" }
                }
            }
        });

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseJson)
            });

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Vercel", "test_token", "unmatched_sha");

        Assert.Equal(expectedUrl, result);
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_Render_ReturnsUrl()
    {
        var responseJson = JsonSerializer.Serialize(new[]
        {
            new
            {
                serviceDetails = new
                {
                    url = "https://myservice.onrender.com"
                }
            }
        });

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseJson)
            });

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Render", "test_token", null);

        Assert.Equal("https://myservice.onrender.com", result);
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_Render_NonSuccess_ReturnsNull()
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized));

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Render", "test_token", null);

        Assert.Null(result);
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_Railway_ReturnsUrl()
    {
        var responseJson = """
        {
          "data": {
            "me": {
              "id": "user-123",
              "projects": {
                "edges": [
                  {
                    "node": {
                      "id": "proj-1",
                      "name": "Production Project",
                      "services": {
                        "edges": [
                          {
                            "node": {
                              "id": "svc-1",
                              "name": "api-service",
                              "serviceDomains": [
                                {
                                  "domain": "api-production.up.railway.app"
                                }
                              ]
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
        """;

        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseJson)
            });

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Railway", "test_token", null);

        Assert.Equal("https://api-production.up.railway.app", result);
    }

    [Fact]
    public async Task FetchLiveDeploymentUrlAsync_Railway_NonSuccess_ReturnsNull()
    {
        var handlerMock = new Mock<HttpMessageHandler>();
        handlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.Unauthorized));

        var client = new HttpClient(handlerMock.Object);
        _httpClientFactoryMock.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(client);

        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("Railway", "test_token", null);

        Assert.Null(result);
    }
}
