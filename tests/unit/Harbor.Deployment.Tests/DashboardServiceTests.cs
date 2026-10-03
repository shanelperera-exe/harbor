using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

public class DashboardServiceTests
{
    private readonly Mock<IDeploymentRepository> _repository = new();
    private readonly DeploymentService _service;

    public DashboardServiceTests()
    {
        _service = new DeploymentService(_repository.Object);
    }

    [Fact]
    public async Task GetDashboardAsync_AggregatesProjectsDeploymentsAndMetrics()
    {
        var now = DateTime.UtcNow;
        var projectEntities = new List<DashboardProjectEntity>
        {
            new()
            {
                Id = 1,
                PublicId = "proj-1234567890",
                Name = "Harbor Core",
                Description = "Core system",
                RepositoryUrl = "https://github.com/org/repo",
                OwnerId = 5,
                CreatedAt = now.AddDays(-10),
                TotalDeployments = 3,
                LatestStatus = "Succeeded",
                LatestDeploymentTime = now.AddHours(-1)
            }
        };

        var deploymentEntities = new List<DashboardDeploymentEntity>
        {
            new()
            {
                Id = 100,
                PublicId = "dep-123456789abc",
                ServiceId = 10,
                ServiceName = "Web API",
                ProjectId = 1,
                ProjectName = "Harbor Core",
                Environment = "production",
                Version = "1.2.0",
                CommitSha = "abcdef123456",
                CommitMessage = "feat: add dashboard",
                Status = "Succeeded",
                StartedAt = now.AddMinutes(-30),
                CompletedAt = now.AddMinutes(-28),
                UserName = "developer"
            }
        };

        var metricsEntity = new DashboardMetricsEntity
        {
            TotalProjects = 1,
            TotalDeployments = 3,
            SuccessfulDeployments = 2,
            RunningDeployments = 1,
            FailedDeployments = 0
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(5, false))
            .ReturnsAsync(projectEntities);
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(5, false, 10))
            .ReturnsAsync(deploymentEntities);
        _repository.Setup(r => r.GetDashboardMetricsAsync(5, false))
            .ReturnsAsync(metricsEntity);

        var result = await _service.GetDashboardAsync(5, isAdmin: false);

        Assert.NotNull(result);
        Assert.Single(result.Projects);
        var proj = result.Projects[0];
        Assert.Equal(1, proj.Id);
        Assert.Equal("Harbor Core", proj.Name);
        Assert.Equal(3, proj.TotalDeployments);
        Assert.Equal("Succeeded", proj.LatestStatus);

        Assert.Single(result.RecentDeployments);
        var dep = result.RecentDeployments[0];
        Assert.Equal(100, dep.Id);
        Assert.Equal("dep-123456789abc", dep.PublicId);
        Assert.Equal("123456789", dep.Hash);
        Assert.Equal("Web API", dep.ServiceName);
        Assert.Equal(1, dep.ProjectId);
        Assert.Equal("Harbor Core", dep.ProjectName);
        Assert.Equal("production", dep.Environment);
        Assert.Equal("1.2.0", dep.Version);
        Assert.Equal("Succeeded", dep.Status);

        Assert.Equal(1, result.Metrics.TotalProjects);
        Assert.Equal(3, result.Metrics.TotalDeployments);
        Assert.Equal(2, result.Metrics.SuccessfulDeployments);
        Assert.Equal(1, result.Metrics.RunningDeployments);
        Assert.Equal(0, result.Metrics.FailedDeployments);
    }

    [Fact]
    public async Task GetDashboardAsync_EmptyData_ReturnsEmptyListsAndZeroCounts()
    {
        _repository.Setup(r => r.GetDashboardProjectsAsync(10, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(10, false, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(10, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(10, isAdmin: false);

        Assert.NotNull(result);
        Assert.Empty(result.Projects);
        Assert.Empty(result.RecentDeployments);
        Assert.Equal(0, result.Metrics.TotalProjects);
        Assert.Equal(0, result.Metrics.TotalDeployments);
        Assert.Equal(0, result.Metrics.SuccessfulDeployments);
        Assert.Equal(0, result.Metrics.RunningDeployments);
        Assert.Equal(0, result.Metrics.FailedDeployments);
    }

    [Fact]
    public async Task GetDashboardAsync_WhenPublicIdEmpty_UsesNumericIdForHash()
    {
        var deploymentEntities = new List<DashboardDeploymentEntity>
        {
            new()
            {
                Id = 42,
                PublicId = string.Empty,
                ServiceId = 1,
                Environment = "production",
                Version = "1.0",
                Status = "Running",
                StartedAt = DateTime.UtcNow
            }
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(deploymentEntities);
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(1, false);

        var item = Assert.Single(result.RecentDeployments);
        Assert.Equal("42", item.PublicId);
        Assert.Equal("42", item.Hash);
        Assert.Equal("Running", item.Status);
    }
}
