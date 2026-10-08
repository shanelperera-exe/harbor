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

    // ── Additional forwarding tests for full coverage ────────────────────────────

    [Fact]
    public async Task GetHistoryAsync_WithServiceId_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetHistoryAsync(1, 10, "Successful", 0, 10))
                  .ReturnsAsync((new List<DeploymentEntity>(), 0));

        await _decorator.GetHistoryAsync(1, 10, "Successful", 0, 10);

        _innerMock.Verify(r => r.GetHistoryAsync(1, 10, "Successful", 0, 10), Times.Once);
        _notifMock.Verify(r => r.CreateAsync(It.IsAny<NotificationEntity>()), Times.Never);
    }

    [Fact]
    public async Task GetByIdAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 5, OwnerId = 7 };
        _innerMock.Setup(r => r.GetByIdAsync(5, 7)).ReturnsAsync(entity);

        var result = await _decorator.GetByIdAsync(5, 7);

        Assert.Same(entity, result);
        _innerMock.Verify(r => r.GetByIdAsync(5, 7), Times.Once);
    }

    [Fact]
    public async Task GetEntityByIdentifierAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 5 };
        _innerMock.Setup(r => r.GetEntityByIdentifierAsync("dep-123", 7, false)).ReturnsAsync(entity);

        var result = await _decorator.GetEntityByIdentifierAsync("dep-123", 7, false);

        Assert.Same(entity, result);
        _innerMock.Verify(r => r.GetEntityByIdentifierAsync("dep-123", 7, false), Times.Once);
    }

    [Fact]
    public async Task GetLogsAsync_ForwardsToInner()
    {
        var logs = new List<DeploymentLogEntity> { new() { Id = 1, DeploymentId = 5, Message = "log" } };
        _innerMock.Setup(r => r.GetLogsAsync(5)).ReturnsAsync(logs);

        var result = await _decorator.GetLogsAsync(5);

        Assert.Same(logs, result);
        _innerMock.Verify(r => r.GetLogsAsync(5), Times.Once);
    }

    [Fact]
    public async Task UpdateTriggerResultAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.UpdateTriggerResultAsync(5, "Failed", "error", null)).ReturnsAsync(true);

        var result = await _decorator.UpdateTriggerResultAsync(5, "Failed", "error", null);

        Assert.True(result);
        _innerMock.Verify(r => r.UpdateTriggerResultAsync(5, "Failed", "error", null), Times.Once);
    }

    [Fact]
    public async Task GetRepositoryNameAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetRepositoryNameAsync(10)).ReturnsAsync("owner/repo");

        var result = await _decorator.GetRepositoryNameAsync(10);

        Assert.Equal("owner/repo", result);
        _innerMock.Verify(r => r.GetRepositoryNameAsync(10), Times.Once);
    }

    [Fact]
    public async Task GetWorkflowFileAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetWorkflowFileAsync(10)).ReturnsAsync("ci.yml");

        var result = await _decorator.GetWorkflowFileAsync(10);

        Assert.Equal("ci.yml", result);
        _innerMock.Verify(r => r.GetWorkflowFileAsync(10), Times.Once);
    }

    [Fact]
    public async Task GetServiceAccessAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetServiceAccessAsync("srv-123"))
                  .ReturnsAsync((true, 7, false, 10, 20));

        var result = await _decorator.GetServiceAccessAsync("srv-123");

        Assert.True(result.Exists);
        Assert.Equal(7, result.OwnerId);
        _innerMock.Verify(r => r.GetServiceAccessAsync("srv-123"), Times.Once);
    }

    [Fact]
    public async Task GetEnvironmentByNameAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetEnvironmentByNameAsync(10, "production"))
                  .ReturnsAsync((true, true, "Production", "https://prod.example.com"));

        var result = await _decorator.GetEnvironmentByNameAsync(10, "production");

        Assert.NotNull(result);
        Assert.True(result.Value.IsActive);
        _innerMock.Verify(r => r.GetEnvironmentByNameAsync(10, "production"), Times.Once);
    }

    [Fact]
    public async Task SetWorkflowRunAsync_ForwardsToInner()
    {
        await _decorator.SetWorkflowRunAsync(5, 12345, "https://github.com/run/12345");

        _innerMock.Verify(r => r.SetWorkflowRunAsync(5, 12345, "https://github.com/run/12345"), Times.Once);
    }

    [Fact]
    public async Task GetByWorkflowRunIdAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 5, WorkflowRunId = 12345 };
        _innerMock.Setup(r => r.GetByWorkflowRunIdAsync(12345)).ReturnsAsync(entity);

        var result = await _decorator.GetByWorkflowRunIdAsync(12345);

        Assert.Same(entity, result);
        _innerMock.Verify(r => r.GetByWorkflowRunIdAsync(12345), Times.Once);
    }

    [Fact]
    public async Task AddLogsAsync_ForwardsToInner()
    {
        await _decorator.AddLogsAsync(5, "deployment log text");

        _innerMock.Verify(r => r.AddLogsAsync(5, "deployment log text"), Times.Once);
    }

    [Fact]
    public async Task CreateCiRunAsync_ForwardsToInner()
    {
        var ciRun = new CiRunEntity { Id = 0, ServiceId = 10, OwnerId = 7 };
        _innerMock.Setup(r => r.CreateCiRunAsync(ciRun)).ReturnsAsync(42);

        var result = await _decorator.CreateCiRunAsync(ciRun);

        Assert.Equal(42, result);
        _innerMock.Verify(r => r.CreateCiRunAsync(ciRun), Times.Once);
    }

    [Fact]
    public async Task UpdateCiRunAsync_ForwardsToInner()
    {
        var ciRun = new CiRunEntity { Id = 1, ServiceId = 10, OwnerId = 7 };
        _innerMock.Setup(r => r.UpdateCiRunAsync(ciRun)).ReturnsAsync(true);

        var result = await _decorator.UpdateCiRunAsync(ciRun);

        Assert.True(result);
        _innerMock.Verify(r => r.UpdateCiRunAsync(ciRun), Times.Once);
    }

    [Fact]
    public async Task GetCiRunsAsync_ForwardsToInner()
    {
        var runs = new List<CiRunEntity> { new() { Id = 1 } };
        _innerMock.Setup(r => r.GetCiRunsAsync(7, 10, 0, 10)).ReturnsAsync(runs);

        var result = await _decorator.GetCiRunsAsync(7, 10, 0, 10);

        Assert.Same(runs, result);
        _innerMock.Verify(r => r.GetCiRunsAsync(7, 10, 0, 10), Times.Once);
    }

    [Fact]
    public async Task GetCiRunsTotalCountAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetCiRunsTotalCountAsync(7, 10)).ReturnsAsync(5);

        var result = await _decorator.GetCiRunsTotalCountAsync(7, 10);

        Assert.Equal(5, result);
        _innerMock.Verify(r => r.GetCiRunsTotalCountAsync(7, 10), Times.Once);
    }

    [Fact]
    public async Task GetCiRunByGitHubRunIdAsync_ForwardsToInner()
    {
        var ciRun = new CiRunEntity { Id = 1, GitHubRunId = 12345 };
        _innerMock.Setup(r => r.GetCiRunByGitHubRunIdAsync(12345)).ReturnsAsync(ciRun);

        var result = await _decorator.GetCiRunByGitHubRunIdAsync(12345);

        Assert.Same(ciRun, result);
        _innerMock.Verify(r => r.GetCiRunByGitHubRunIdAsync(12345), Times.Once);
    }

    [Fact]
    public async Task GetServiceByRepositoryAsync_ForwardsToInner()
    {
        _innerMock.Setup(r => r.GetServiceByRepositoryAsync("owner/repo")).ReturnsAsync((10, 7));

        var result = await _decorator.GetServiceByRepositoryAsync("owner/repo");

        Assert.NotNull(result);
        Assert.Equal(10, result.Value.ServiceId);
        _innerMock.Verify(r => r.GetServiceByRepositoryAsync("owner/repo"), Times.Once);
    }

    [Fact]
    public async Task GetSucceededForRedeployAsync_ForwardsToInner()
    {
        var entity = new DeploymentEntity { Id = 5, Status = "Successful" };
        _innerMock.Setup(r => r.GetSucceededForRedeployAsync(5)).ReturnsAsync(entity);

        var result = await _decorator.GetSucceededForRedeployAsync(5);

        Assert.Same(entity, result);
        _innerMock.Verify(r => r.GetSucceededForRedeployAsync(5), Times.Once);
    }

    [Fact]
    public async Task CreateFromSourceAsync_ForwardsToInner()
    {
        var source = new DeploymentEntity { Id = 5, ServiceId = 10, OwnerId = 7 };
        _innerMock.Setup(r => r.CreateFromSourceAsync(source)).ReturnsAsync(42);

        var result = await _decorator.CreateFromSourceAsync(source);

        Assert.Equal(42, result);
        _innerMock.Verify(r => r.CreateFromSourceAsync(source), Times.Once);
    }

    [Fact]
    public async Task GetDashboardProjectsAsync_ForwardsToInner()
    {
        var projects = new List<DashboardProjectEntity> { new() { Id = 1, Name = "test" } };
        _innerMock.Setup(r => r.GetDashboardProjectsAsync(7, false)).ReturnsAsync(projects);

        var result = await _decorator.GetDashboardProjectsAsync(7, false);

        Assert.Same(projects, result);
        _innerMock.Verify(r => r.GetDashboardProjectsAsync(7, false), Times.Once);
    }

    [Fact]
    public async Task GetDashboardRecentDeploymentsAsync_ForwardsToInner()
    {
        var deployments = new List<DashboardDeploymentEntity> { new() { Id = 1 } };
        _innerMock.Setup(r => r.GetDashboardRecentDeploymentsAsync(7, false, 5)).ReturnsAsync(deployments);

        var result = await _decorator.GetDashboardRecentDeploymentsAsync(7, false, 5);

        Assert.Same(deployments, result);
        _innerMock.Verify(r => r.GetDashboardRecentDeploymentsAsync(7, false, 5), Times.Once);
    }

    [Fact]
    public async Task GetDashboardMetricsAsync_ForwardsToInner()
    {
        var metrics = new DashboardMetricsEntity { TotalProjects = 1 };
        _innerMock.Setup(r => r.GetDashboardMetricsAsync(7, false)).ReturnsAsync(metrics);

        var result = await _decorator.GetDashboardMetricsAsync(7, false);

        Assert.Same(metrics, result);
        _innerMock.Verify(r => r.GetDashboardMetricsAsync(7, false), Times.Once);
    }
}
