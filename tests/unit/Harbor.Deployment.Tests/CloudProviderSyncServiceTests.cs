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
    public async Task FetchLiveDeploymentUrlAsync_EmptyInputs_ReturnsNull()
    {
        var service = new CloudProviderSyncService(
            _httpClientFactoryMock.Object,
            _secretProtectorMock.Object,
            NullLogger<CloudProviderSyncService>.Instance);

        var result = await service.FetchLiveDeploymentUrlAsync("", "", null);

        Assert.Null(result);
    }
}
