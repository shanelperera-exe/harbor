using Harbor.Caching;
using Harbor.Reporting.Hubs;
using Harbor.Reporting.Services;
using Microsoft.AspNetCore.SignalR;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class ServiceLogsHubTests
{
    private readonly Mock<ICacheService> _cacheMock = new();
    private readonly Mock<IActiveSubscriptionTracker> _trackerMock = new();
    private readonly Mock<IHubCallerClients> _clientsMock = new();
    private readonly Mock<ISingleClientProxy> _callerMock = new();
    private readonly Mock<IGroupManager> _groupsMock = new();
    private readonly Mock<HubCallerContext> _contextMock = new();
    private readonly ServiceLogsHub _hub;

    public ServiceLogsHubTests()
    {
        _clientsMock.Setup(c => c.Caller).Returns(_callerMock.Object);
        _contextMock.Setup(c => c.ConnectionId).Returns("conn-123");

        _hub = new ServiceLogsHub(_cacheMock.Object, _trackerMock.Object)
        {
            Context = _contextMock.Object,
            Groups = _groupsMock.Object,
            Clients = _clientsMock.Object
        };
    }

    [Fact]
    public async Task SubscribeToService_WithBufferedLogs_SendsHistoryAndWelcome()
    {
        var buffered = new List<object> { new { msg = "line 1" } };
        _cacheMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:s-10")).ReturnsAsync(buffered);

        await _hub.SubscribeToService("s-10");

        _groupsMock.Verify(g => g.AddToGroupAsync("conn-123", "logs_s-10", default), Times.Once);
        _trackerMock.Verify(t => t.AddSubscription("s-10", "conn-123"), Times.Once);
        // Buffered log + welcome message = 2 calls
        _callerMock.Verify(c => c.SendCoreAsync("ReceiveLog", It.IsAny<object[]>(), default), Times.Exactly(2));
    }

    [Fact]
    public async Task SubscribeToService_NoBufferedLogs_SendsWelcomeOnly()
    {
        _cacheMock.Setup(c => c.GetAsync<List<object>>("logs:buffer:s-10")).ReturnsAsync((List<object>?)null);

        await _hub.SubscribeToService("s-10");

        _groupsMock.Verify(g => g.AddToGroupAsync("conn-123", "logs_s-10", default), Times.Once);
        _trackerMock.Verify(t => t.AddSubscription("s-10", "conn-123"), Times.Once);
        _callerMock.Verify(c => c.SendCoreAsync("ReceiveLog", It.IsAny<object[]>(), default), Times.Once);
    }

    [Fact]
    public async Task UnsubscribeFromService_RemovesGroupAndTracker()
    {
        await _hub.UnsubscribeFromService("s-10");

        _groupsMock.Verify(g => g.RemoveFromGroupAsync("conn-123", "logs_s-10", default), Times.Once);
        _trackerMock.Verify(t => t.RemoveSubscription("s-10", "conn-123"), Times.Once);
    }

    [Fact]
    public async Task OnDisconnectedAsync_CompletesSuccessfully()
    {
        await _hub.OnDisconnectedAsync(null);
        await _hub.OnDisconnectedAsync(new Exception("Network drop"));
    }
}
