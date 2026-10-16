using System.Text;
using Harbor.Caching;
using Harbor.Reporting.Controllers;
using Harbor.Reporting.Hubs;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class WebhooksControllerTests
{
    private readonly Mock<ILogger<WebhooksController>> _loggerMock = new();
    private readonly Mock<IHubContext<ServiceLogsHub>> _hubContextMock = new();
    private readonly Mock<IHubClients> _clientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly Mock<ICacheService> _cacheMock = new();
    private readonly WebhooksController _controller;

    public WebhooksControllerTests()
    {
        _hubContextMock.Setup(h => h.Clients).Returns(_clientsMock.Object);
        _clientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(_clientProxyMock.Object);

        _controller = new WebhooksController(_loggerMock.Object, _hubContextMock.Object, _cacheMock.Object);
    }

    private void SetRequestBody(string body)
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
    }

    [Fact]
    public async Task ReceiveLogDrain_EmptyPayload_ReturnsBadRequest()
    {
        SetRequestBody("   ");

        var result = await _controller.ReceiveLogDrain("vercel", "svc-123");

        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Empty payload", badRequest.Value);
    }

    [Fact]
    public async Task ReceiveLogDrain_VercelNdjson_ProcessesAndBroadcasts()
    {
        var ndjson = """
            {"type":"request","statusCode":200,"host":"app.vercel.app","path":"/api/health","method":"GET"}
            {"message":"Server initialized successfully"}
            invalid-json-line-to-skip
            """;
        SetRequestBody(ndjson);

        _cacheMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:svc-123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<object>());

        var result = await _controller.ReceiveLogDrain("vercel", "svc-123");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        _clientsMock.Verify(c => c.Group("logs_svc-123"), Times.AtLeast(2));
        _clientProxyMock.Verify(c => c.SendCoreAsync("ReceiveLog", It.IsAny<object?[]>(), default), Times.AtLeast(2));
        _cacheMock.Verify(c => c.SetAsync("logs:buffer:svc-123", It.IsAny<List<object>>(), It.IsAny<TimeSpan?>(), default), Times.AtLeast(2));
    }

    [Fact]
    public async Task ReceiveLogDrain_GenericProvider_ProcessesFallback()
    {
        SetRequestBody("raw unparsed log text");

        _cacheMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:svc-456", It.IsAny<CancellationToken>()))
            .ReturnsAsync((List<object>?)null);

        var result = await _controller.ReceiveLogDrain("docker", "svc-456");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);

        _clientsMock.Verify(c => c.Group("logs_svc-456"), Times.Once);
    }
}
