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

    // ---------- CreateAsync: Scenario 1 - Valid deployment request ----------

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesDeployment()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = "1.4.0", CommitSha = "abc123" };
        const int ownerId = 7;

        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        Assert.True(result.Success);
        Assert.Null(result.Error);
        Assert.Equal(42, result.DeploymentId);

        _repository.Verify(r => r.CreateAsync(It.Is<DeploymentEntity>(d =>
            d.ProjectId == 13 && d.OwnerId == ownerId && d.Environment == "production" &&
            d.Version == "1.4.0" && d.CommitSha == "abc123" && d.Status == "Pending" &&
            d.StartedAt != default)), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_StoresCorrectInitialStatusAndTimestamp()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "staging", Version = "2.0.0" };
        const int ownerId = 7;
        var now = DateTime.UtcNow;

        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "staging")).ReturnsAsync((true, true, "Staging"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(1);

        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        Assert.True(result.Success);
        var deployedEntity = _repository.Invocations
            .Single(i => i.Method.Name == "CreateAsync")
            .Arguments[0] as DeploymentEntity;
        Assert.NotNull(deployedEntity);
        Assert.Equal("Pending", deployedEntity.Status);
        Assert.Equal(ownerId, deployedEntity.OwnerId);
        Assert.Equal(request.ProjectId, deployedEntity.ProjectId);
        Assert.Equal(request.Environment, deployedEntity.Environment);
        Assert.Equal(request.Version, deployedEntity.Version);
        Assert.True(deployedEntity.StartedAt <= DateTime.UtcNow);
    }

    // ---------- CreateAsync: Scenario 3 - Invalid/missing data ----------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_MissingVersion_ReturnsValidationError(string? version)
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = version! };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "production")).ReturnsAsync((true, true, "Production"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Version is required.", result.Error);
        Assert.Null(result.DeploymentId);

        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_UnknownProject_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ProjectId = 999, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(999)).ReturnsAsync((false, 0, false));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Project not found.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ArchivedProject_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ProjectId = 999, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(999)).ReturnsAsync((true, 7, true));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Project is archived.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_EnvironmentNotFound_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "nonexistent", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "nonexistent")).ReturnsAsync((true, false, "Development"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment is not valid for this project.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_InactiveEnvironment_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "production")).ReturnsAsync((true, false, "Production"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment is not valid for this project.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_UnsupportedEnvironmentType_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "qa", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "qa")).ReturnsAsync((true, true, "QA"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment type is not supported.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    // ---------- Authorization ----------

    [Fact]
    public async Task CreateAsync_NonOwnerNonAdmin_ReturnsForbidden()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));

        var result = await _service.CreateAsync(request, ownerId: 99, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("You do not have permission to deploy this project.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_AdminCanDeployToOtherUsersProject()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 7, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId: 99, isAdmin: true);

        Assert.True(result.Success);
        Assert.Equal(42, result.DeploymentId);
    }

    [Fact]
    public async Task CreateAsync_OwnerCanDeployToOwnProject()
    {
        var request = new CreateDeploymentRequest { ProjectId = 13, Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetProjectAccessAsync(13)).ReturnsAsync((true, 13, false));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(13, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId: 13, isAdmin: false);

        Assert.True(result.Success);
        Assert.Equal(42, result.DeploymentId);
    }
}
