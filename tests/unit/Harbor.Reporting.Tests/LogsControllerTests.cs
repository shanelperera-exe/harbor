using Harbor.Caching;
using Harbor.Reporting.Controllers;
using Harbor.Reporting.DTOs;
using Harbor.Reporting.Hubs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class LogsControllerTests
{
    private readonly Mock<IHubContext<ServiceLogsHub>> _hubContextMock = new();
    private readonly Mock<IHubClients> _hubClientsMock = new();
    private readonly Mock<IClientProxy> _clientProxyMock = new();
    private readonly Mock<ICacheService> _cacheServiceMock = new();
    private readonly LogsController _controller;

    public LogsControllerTests()
    {
        _hubClientsMock.Setup(c => c.Group(It.IsAny<string>())).Returns(_clientProxyMock.Object);
        _hubContextMock.Setup(h => h.Clients).Returns(_hubClientsMock.Object);
        _controller = new LogsController(_hubContextMock.Object, _cacheServiceMock.Object);
    }

    [Fact]
    public async Task IngestLog_InvalidModelState_ReturnsBadRequest()
    {
        _controller.ModelState.AddModelError("Message", "Message is required");
        var result = await _controller.IngestLog("s-1", new LogIngestRequest());
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task IngestLog_ValidRequest_BroadcastsAndCachesLog()
    {
        var request = new LogIngestRequest
        {
            Message = "Application started",
            Level = "INFO",
            Timestamp = "12:00:00"
        };

        _cacheServiceMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:s-1"))
            .ReturnsAsync(new List<object>());

        var result = await _controller.IngestLog("s-1", request);
        var ok = Assert.IsType<OkObjectResult>(result);

        _clientProxyMock.Verify(c => c.SendCoreAsync("ReceiveLog", It.Is<object[]>(args => (string)args[0] == "s-1"), default), Times.Once);
        _cacheServiceMock.Verify(c => c.SetAsync("logs:buffer:s-1", It.Is<List<object>>(l => l.Count == 1), TimeSpan.FromHours(24)), Times.Once);
    }

    [Fact]
    public async Task IngestLog_BufferExceeds100_TrimsOldLogs()
    {
        var request = new LogIngestRequest
        {
            Message = "New log line",
            Level = "[DEBUG]"
        };

        var existingLogs = Enumerable.Range(1, 105).Select(i => (object)new { message = $"Log {i}" }).ToList();
        _cacheServiceMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:s-1"))
            .ReturnsAsync(existingLogs);

        var result = await _controller.IngestLog("s-1", request);
        Assert.IsType<OkObjectResult>(result);

        // Should trim back down to 100
        _cacheServiceMock.Verify(c => c.SetAsync("logs:buffer:s-1", It.Is<List<object>>(l => l.Count == 100), TimeSpan.FromHours(24)), Times.Once);
    }
}
