using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

/// <summary>
/// Unit tests for <see cref="NotificationAwareDeploymentRepository"/> (US-21).
/// Verifies that the decorator creates notifications only on terminal state transitions
/// and correctly forwards all other calls to the inner repository.
/// </summary>
public class NotificationAwareDeploymentRepositoryTests
{
    private readonly Mock<IDeploymentRepository>   _innerMock  = new();
    private readonly Mock<INotificationRepository> _notifMock  = new();
    private readonly Mock<ILogger<NotificationAwareDeploymentRepository>> _loggerMock = new();
    private readonly NotificationAwareDeploymentRepository _decorator;

    public NotificationAwareDeploymentRepositoryTests()
    {
        _decorator = new NotificationAwareDeploymentRepository(
            _innerMock.Object,
            _notifMock.Object,
            _loggerMock.Object);
    }

    // ── UpdateStatusAsync — notification creation ─────────────────────────────

    [Fact]
    public async Task UpdateStatusAsync_SuccessfulStatus_CreatesSuccessNotification()
    {
        // Arrange
        var deployment = new DeploymentEntity
        {
            Id = 10, OwnerId = 42, ServiceId = 3,
            ServiceName = "api-service", Environment = "production", Version = "1.0.0", Status = "Running"
        };
        _innerMock.Setup(r => r.UpdateStatusAsync(10, "Successful", null)).ReturnsAsync(true);
        _innerMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _notifMock.Setup(r => r.CreateAsync(It.IsAny<NotificationEntity>())).ReturnsAsync(99);

        // Act
        var result = await _decorator.UpdateStatusAsync(10, "Successful", null);

        // Assert
        Assert.True(result);
        _notifMock.Verify(r => r.CreateAsync(It.Is<NotificationEntity>(n =>
            n.UserId       == 42            &&
            n.DeploymentId == 10            &&
            n.Type         == "success"     &&
            n.Title.Contains("api-service") &&
            n.Message.Contains("production"))), Times.Once);
    }

    [Fact]
    public async Task UpdateStatusAsync_FailedStatus_CreatesFailureNotificationWithReason()
    {
        // Arrange
        var deployment = new DeploymentEntity
        {
            Id = 20, OwnerId = 7, ServiceId = 5,
            ServiceName = "worker", Environment = "staging", Version = "2.3.1", Status = "Running"
        };
        _innerMock.Setup(r => r.UpdateStatusAsync(20, "Failed", "OOM")).ReturnsAsync(true);
        _innerMock.Setup(r => r.GetEntityByIdAsync(20)).ReturnsAsync(deployment);
        _notifMock.Setup(r => r.CreateAsync(It.IsAny<NotificationEntity>())).ReturnsAsync(100);

        // Act
        var result = await _decorator.UpdateStatusAsync(20, "Failed", "OOM");

        // Assert
        Assert.True(result);
        _notifMock.Verify(r => r.CreateAsync(It.Is<NotificationEntity>(n =>
            n.UserId       == 7         &&
            n.DeploymentId == 20        &&
            n.Type         == "failure" &&
            n.Message.Contains("OOM"))), Times.Once);
    }

    [Theory]
    [InlineData("Running")]
    [InlineData("Pending")]
    [InlineData("Queued")]
    public async Task UpdateStatusAsync_NonTerminalStatus_DoesNotCreateNotification(string status)
    {
        _innerMock.Setup(r => r.UpdateStatusAsync(5, status, null)).ReturnsAsync(true);

        var result = await _decorator.UpdateStatusAsync(5, status, null);

        Assert.True(result);
        _notifMock.Verify(r => r.CreateAsync(It.IsAny<NotificationEntity>()), Times.Never);
        _innerMock.Verify(r => r.GetEntityByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStatusAsync_InnerReturnsFalse_DoesNotCreateNotification()
    {
        _innerMock.Setup(r => r.UpdateStatusAsync(5, "Successful", null)).ReturnsAsync(false);

        var result = await _decorator.UpdateStatusAsync(5, "Successful", null);

        Assert.False(result);
        _notifMock.Verify(r => r.CreateAsync(It.IsAny<NotificationEntity>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStatusAsync_DeploymentNotFoundAfterUpdate_DoesNotThrow()
    {
        _innerMock.Setup(r => r.UpdateStatusAsync(99, "Successful", null)).ReturnsAsync(true);
        _innerMock.Setup(r => r.GetEntityByIdAsync(99)).ReturnsAsync((DeploymentEntity?)null);

        // Should not throw — notification failure is swallowed
        var result = await _decorator.UpdateStatusAsync(99, "Successful", null);

        Assert.True(result);
        _notifMock.Verify(r => r.CreateAsync(It.IsAny<NotificationEntity>()), Times.Never);
    }

    [Fact]
    public async Task UpdateStatusAsync_NotificationCreationThrows_DoesNotPropagateException()
    {
        var deployment = new DeploymentEntity { Id = 1, OwnerId = 1, Version = "1", Environment = "prod", Status = "Running" };
        _innerMock.Setup(r => r.UpdateStatusAsync(1, "Successful", null)).ReturnsAsync(true);
        _innerMock.Setup(r => r.GetEntityByIdAsync(1)).ReturnsAsync(deployment);
        _notifMock.Setup(r => r.CreateAsync(It.IsAny<NotificationEntity>())).ThrowsAsync(new Exception("DB error"));

        // Should not throw — notification failure is swallowed (deployment flow must not break)
        var result = await _decorator.UpdateStatusAsync(1, "Successful", null);

        Assert.True(result);
    }

    // ── No false notifications on scenario 3 ─────────────────────────────────

    [Fact]
    public async Task GetHistoryAsync_NeverCreatesNotifications()
    {
        // Calling a read-only method (not UpdateStatusAsync) must never trigger notification creation.
        _innerMock.Setup(r => r.GetHistoryAsync(1, null, null, null, null, 0, 10))
                  .ReturnsAsync((new List<DeploymentEntity>(), 0));

        await _decorator.GetHistoryAsync(1, null, null, null, null, 0, 10);

        _notifMock.Verify(r => r.CreateAsync(It.IsAny<NotificationEntity>()), Times.Never);
    }

    // ── Forwarding ────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 0 };
        _innerMock.Setup(r => r.CreateAsync(entity)).ReturnsAsync(7);

        var id = await _decorator.CreateAsync(entity);

        Assert.Equal(7, id);
        _innerMock.Verify(r => r.CreateAsync(entity), Times.Once);
    }

    [Fact]
    public async Task GetEntityByIdAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 5 };
        _innerMock.Setup(r => r.GetEntityByIdAsync(5)).ReturnsAsync(entity);

        var result = await _decorator.GetEntityByIdAsync(5);

        Assert.Same(entity, result);
        _innerMock.Verify(r => r.GetEntityByIdAsync(5), Times.Once);
    }
}
