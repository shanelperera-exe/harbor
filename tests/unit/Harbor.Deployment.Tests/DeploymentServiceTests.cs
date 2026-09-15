using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

public class DeploymentServiceTests
{
    private readonly Mock<IDeploymentRepository> _repository = new();
    private readonly DeploymentService _service;

    public DeploymentServiceTests() => _service = new DeploymentService(_repository.Object);

    [Fact]
    public async Task GetHistoryAsync_ReturnsPagedDeploymentSummaries()
    {
        var startedAt = DateTime.UtcNow;
        _repository.Setup(r => r.GetHistoryAsync(7, 13, "Succeeded", 0, 20)).ReturnsAsync((new List<DeploymentEntity>
        {
            new() { Id = 22, OwnerId = 7, ProjectId = 13, Environment = "production", Version = "1.4.0", CommitSha = "f00ba41234", Status = "Succeeded", StartedAt = startedAt }
        }, 1));

        var result = await _service.GetHistoryAsync(7, new DeploymentHistoryQuery { ProjectId = 13, Status = " Succeeded ", Page = 1, PageSize = 20 });

        var deployment = Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal("production", deployment.Environment);
        Assert.Equal("1.4.0", deployment.Version);
        Assert.Equal("f00ba41234", deployment.CommitSha);
        Assert.Equal("Succeeded", deployment.Status);
    }

    [Fact]
    public async Task GetDetailsAsync_FailedDeployment_ReturnsFailureReasonAndLogs()
    {
        var deployment = new DeploymentEntity { Id = 8, OwnerId = 7, ProjectId = 13, Environment = "staging", Version = "1.5.0", Status = "Failed", StartedAt = DateTime.UtcNow, FailureReason = "Health check did not become ready." };
        _repository.Setup(r => r.GetByIdAsync(8, 7)).ReturnsAsync(deployment);
        _repository.Setup(r => r.GetLogsAsync(8)).ReturnsAsync(new List<DeploymentLogEntity>
        {
            new() { DeploymentId = 8, Timestamp = deployment.StartedAt, Level = "Error", Message = "Readiness probe timed out." }
        });

        var result = await _service.GetDetailsAsync(8, 7);

        Assert.NotNull(result);
        Assert.Equal("Failed", result!.Status);
        Assert.Equal("Health check did not become ready.", result.FailureReason);
        var log = Assert.Single(result.Logs);
        Assert.Equal("Error", log.Level);
        Assert.Equal("Readiness probe timed out.", log.Message);
    }

    [Fact]
    public async Task GetDetailsAsync_UnknownOrOtherUsersDeployment_ReturnsNull()
    {
        _repository.Setup(r => r.GetByIdAsync(99, 7)).ReturnsAsync((DeploymentEntity?)null);

        var result = await _service.GetDetailsAsync(99, 7);

        Assert.Null(result);
        _repository.Verify(r => r.GetLogsAsync(It.IsAny<int>()), Times.Never);
    }
}
