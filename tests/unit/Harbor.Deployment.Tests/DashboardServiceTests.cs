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

    [Fact]
    public async Task GetDashboardAsync_AdminUser_CallsRepositoryWithIsAdminTrue()
    {
        _repository.Setup(r => r.GetDashboardProjectsAsync(1, true))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, true, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, true))
            .ReturnsAsync(new DashboardMetricsEntity());

        await _service.GetDashboardAsync(1, isAdmin: true);

        _repository.Verify(r => r.GetDashboardProjectsAsync(1, true), Times.Once);
        _repository.Verify(r => r.GetDashboardRecentDeploymentsAsync(1, true, 10), Times.Once);
        _repository.Verify(r => r.GetDashboardMetricsAsync(1, true), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_DefaultLimitUsed_ForRecentDeployments()
    {
        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        await _service.GetDashboardAsync(1, false);

        _repository.Verify(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10), Times.Once);
    }

    [Fact]
    public async Task GetDashboardAsync_MultipleProjects_AllMappedCorrectly()
    {
        var now = DateTime.UtcNow;
        var projectEntities = new List<DashboardProjectEntity>
        {
            new()
            {
                Id = 1,
                PublicId = "proj-1",
                Name = "Project Alpha",
                Description = "First project",
                RepositoryUrl = "https://github.com/org/alpha",
                OwnerId = 1,
                CreatedAt = now.AddDays(-10),
                TotalDeployments = 5,
                LatestStatus = "Succeeded",
                LatestDeploymentTime = now.AddHours(-1)
            },
            new()
            {
                Id = 2,
                PublicId = "proj-2",
                Name = "Project Beta",
                Description = null,
                RepositoryUrl = null,
                OwnerId = 1,
                CreatedAt = now.AddDays(-5),
                TotalDeployments = 2,
                LatestStatus = "Failed",
                LatestDeploymentTime = now.AddHours(-2)
            },
            new()
            {
                Id = 3,
                PublicId = "proj-3",
                Name = "Project Gamma",
                Description = "Third project",
                RepositoryUrl = "https://github.com/org/gamma",
                OwnerId = 1,
                CreatedAt = now.AddDays(-1),
                TotalDeployments = 0,
                LatestStatus = null,
                LatestDeploymentTime = null
            }
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(projectEntities);
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity { TotalProjects = 3 });

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal(3, result.Projects.Count);
        Assert.Equal("Project Alpha", result.Projects[0].Name);
        Assert.Equal("First project", result.Projects[0].Description);
        Assert.Equal("https://github.com/org/alpha", result.Projects[0].RepositoryUrl);
        Assert.Equal(5, result.Projects[0].TotalDeployments);
        Assert.Equal("Succeeded", result.Projects[0].LatestStatus);

        Assert.Equal("Project Beta", result.Projects[1].Name);
        Assert.Null(result.Projects[1].Description);
        Assert.Null(result.Projects[1].RepositoryUrl);
        Assert.Equal(2, result.Projects[1].TotalDeployments);
        Assert.Equal("Failed", result.Projects[1].LatestStatus);

        Assert.Equal("Project Gamma", result.Projects[2].Name);
        Assert.Equal("Third project", result.Projects[2].Description);
        Assert.Equal("https://github.com/org/gamma", result.Projects[2].RepositoryUrl);
        Assert.Equal(0, result.Projects[2].TotalDeployments);
        Assert.Null(result.Projects[2].LatestStatus);
    }

    [Fact]
    public async Task GetDashboardAsync_MultipleDeployments_AllMappedWithCorrectStatuses()
    {
        var now = DateTime.UtcNow;
        var deploymentEntities = new List<DashboardDeploymentEntity>
        {
            new()
            {
                Id = 1,
                PublicId = "dep-1",
                ServiceId = 10,
                ServiceName = "Service A",
                ProjectId = 1,
                ProjectName = "Project Alpha",
                Environment = "production",
                Version = "1.0.0",
                CommitSha = "aaa111",
                CommitMessage = "Initial commit",
                Status = "Succeeded",
                StartedAt = now.AddMinutes(-60),
                CompletedAt = now.AddMinutes(-58),
                UserName = "user1"
            },
            new()
            {
                Id = 2,
                PublicId = "dep-2",
                ServiceId = 11,
                ServiceName = "Service B",
                ProjectId = 1,
                ProjectName = "Project Alpha",
                Environment = "staging",
                Version = "1.1.0",
                CommitSha = "bbb222",
                CommitMessage = "Feature add",
                Status = "Running",
                StartedAt = now.AddMinutes(-30),
                CompletedAt = null,
                UserName = "user2"
            },
            new()
            {
                Id = 3,
                PublicId = "dep-3",
                ServiceId = 12,
                ServiceName = "Service C",
                ProjectId = 2,
                ProjectName = "Project Beta",
                Environment = "production",
                Version = "2.0.0",
                CommitSha = "ccc333",
                CommitMessage = "Major release",
                Status = "Failed",
                StartedAt = now.AddMinutes(-10),
                CompletedAt = now.AddMinutes(-8),
                UserName = "user1"
            },
            new()
            {
                Id = 4,
                PublicId = "dep-4",
                ServiceId = 13,
                ServiceName = "Service D",
                ProjectId = 2,
                ProjectName = "Project Beta",
                Environment = "development",
                Version = "0.9.0",
                CommitSha = "ddd444",
                CommitMessage = "WIP",
                Status = "Pending",
                StartedAt = now.AddMinutes(-5),
                CompletedAt = null,
                UserName = "user3"
            },
            new()
            {
                Id = 5,
                PublicId = "dep-5",
                ServiceId = 14,
                ServiceName = "Service E",
                ProjectId = 3,
                ProjectName = "Project Gamma",
                Environment = "production",
                Version = "1.5.0",
                CommitSha = null,
                CommitMessage = null,
                Status = "Succeeded",
                StartedAt = now.AddHours(-1),
                CompletedAt = now.AddMinutes(-55),
                UserName = "user2"
            }
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(deploymentEntities);
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal(5, result.RecentDeployments.Count);

        var dep1 = result.RecentDeployments[0];
        Assert.Equal("Succeeded", dep1.Status);
        Assert.Equal("Service A", dep1.ServiceName);
        Assert.Equal("Project Alpha", dep1.ProjectName);
        Assert.Equal("production", dep1.Environment);
        Assert.Equal("1.0.0", dep1.Version);
        Assert.Equal("aaa111", dep1.CommitSha);
        Assert.Equal("Initial commit", dep1.CommitMessage);
        Assert.Equal("user1", dep1.UserName);

        var dep2 = result.RecentDeployments[1];
        Assert.Equal("Running", dep2.Status);
        Assert.Equal("Service B", dep2.ServiceName);
        Assert.Equal("staging", dep2.Environment);
        Assert.Null(dep2.CompletedAt);

        var dep3 = result.RecentDeployments[2];
        Assert.Equal("Failed", dep3.Status);
        Assert.Equal("Service C", dep3.ServiceName);
        Assert.Equal("production", dep3.Environment);
        Assert.NotNull(dep3.CompletedAt);

        var dep4 = result.RecentDeployments[3];
        Assert.Equal("Pending", dep4.Status);
        Assert.Equal("Service D", dep4.ServiceName);
        Assert.Equal("development", dep4.Environment);
        Assert.Null(dep4.CompletedAt);

        var dep5 = result.RecentDeployments[4];
        Assert.Equal("Succeeded", dep5.Status);
        Assert.Null(dep5.CommitSha);
        Assert.Null(dep5.CommitMessage);
    }

    [Fact]
    public async Task GetDashboardAsync_VariousStatusValues_PreservedCorrectly()
    {
        var now = DateTime.UtcNow;
        var statuses = new[] { "Succeeded", "Failed", "Running", "Pending", "Queued", "Error", "Ready", "Cancelled" };

        var deploymentEntities = statuses.Select((s, i) => new DashboardDeploymentEntity
        {
            Id = i + 1,
            PublicId = $"dep-{i + 1}",
            ServiceId = 10 + i,
            ServiceName = $"Service {i + 1}",
            ProjectId = 1,
            ProjectName = "Test Project",
            Environment = "production",
            Version = "1.0.0",
            CommitSha = "abc123",
            CommitMessage = "Test",
            Status = s,
            StartedAt = now.AddMinutes(-(i + 1) * 10),
            CompletedAt = s == "Succeeded" || s == "Failed" ? now.AddMinutes(-(i + 1) * 10 + 2) : null,
            UserName = "testuser"
        }).ToList();

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(deploymentEntities);
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal(statuses.Length, result.RecentDeployments.Count);
        for (int i = 0; i < statuses.Length; i++)
        {
            Assert.Equal(statuses[i], result.RecentDeployments[i].Status);
        }
    }

    [Fact]
    public async Task GetDashboardAsync_ProjectsMappedInRepositoryOrder()
    {
        // The service preserves the order returned by the repository.
        // Repository query orders by CreatedAt DESC, so we verify mapping preserves that order.
        var now = DateTime.UtcNow;
        var projectEntities = new List<DashboardProjectEntity>
        {
            // Simulating repository returning newest first (as DB query does)
            new() { Id = 3, PublicId = "p3", Name = "Newest", OwnerId = 1, CreatedAt = now.AddDays(-1), TotalDeployments = 1, LatestStatus = "Succeeded" },
            new() { Id = 2, PublicId = "p2", Name = "Middle", OwnerId = 1, CreatedAt = now.AddDays(-5), TotalDeployments = 1, LatestStatus = "Succeeded" },
            new() { Id = 1, PublicId = "p1", Name = "Oldest", OwnerId = 1, CreatedAt = now.AddDays(-10), TotalDeployments = 1, LatestStatus = "Succeeded" }
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(projectEntities);
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal("Newest", result.Projects[0].Name);
        Assert.Equal("Middle", result.Projects[1].Name);
        Assert.Equal("Oldest", result.Projects[2].Name);
    }

    [Fact]
    public async Task GetDashboardAsync_DeploymentsMappedInRepositoryOrder()
    {
        // The service preserves the order returned by the repository.
        // Repository query orders by StartedAt DESC, so we verify mapping preserves that order.
        var now = DateTime.UtcNow;
        var deploymentEntities = new List<DashboardDeploymentEntity>
        {
            // Simulating repository returning most recent first (as DB query does)
            new() { Id = 3, PublicId = "d3", ServiceId = 12, ServiceName = "S3", ProjectId = 1, ProjectName = "P", Environment = "prod", Version = "1", Status = "Succeeded", StartedAt = now.AddMinutes(-30), UserName = "u" },
            new() { Id = 2, PublicId = "d2", ServiceId = 11, ServiceName = "S2", ProjectId = 1, ProjectName = "P", Environment = "prod", Version = "1", Status = "Succeeded", StartedAt = now.AddHours(-1), UserName = "u" },
            new() { Id = 1, PublicId = "d1", ServiceId = 10, ServiceName = "S1", ProjectId = 1, ProjectName = "P", Environment = "prod", Version = "1", Status = "Succeeded", StartedAt = now.AddHours(-2), UserName = "u" }
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(deploymentEntities);
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(new DashboardMetricsEntity());

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal(3, result.RecentDeployments[0].Id); // Most recent first
        Assert.Equal(2, result.RecentDeployments[1].Id);
        Assert.Equal(1, result.RecentDeployments[2].Id);
    }

    [Fact]
    public async Task GetDashboardAsync_MetricsMappedCorrectly()
    {
        var metricsEntity = new DashboardMetricsEntity
        {
            TotalProjects = 10,
            TotalDeployments = 100,
            SuccessfulDeployments = 70,
            RunningDeployments = 15,
            FailedDeployments = 15
        };

        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ReturnsAsync(new List<DashboardProjectEntity>());
        _repository.Setup(r => r.GetDashboardRecentDeploymentsAsync(1, false, 10))
            .ReturnsAsync(new List<DashboardDeploymentEntity>());
        _repository.Setup(r => r.GetDashboardMetricsAsync(1, false))
            .ReturnsAsync(metricsEntity);

        var result = await _service.GetDashboardAsync(1, false);

        Assert.Equal(10, result.Metrics.TotalProjects);
        Assert.Equal(100, result.Metrics.TotalDeployments);
        Assert.Equal(70, result.Metrics.SuccessfulDeployments);
        Assert.Equal(15, result.Metrics.RunningDeployments);
        Assert.Equal(15, result.Metrics.FailedDeployments);
    }

    [Fact]
    public async Task GetDashboardAsync_RepositoryThrows_PropagatesException()
    {
        _repository.Setup(r => r.GetDashboardProjectsAsync(1, false))
            .ThrowsAsync(new InvalidOperationException("Database connection failed"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetDashboardAsync(1, false));
    }
}
