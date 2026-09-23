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

    // ---------- GetHistoryAsync ----------

    [Fact]
    public async Task GetHistoryAsync_ReturnsPagedDeploymentSummaries()
    {
        var startedAt = DateTime.UtcNow;
        _repository.Setup(r => r.GetHistoryAsync(7, 13, "Succeeded", 0, 20)).ReturnsAsync((new List<DeploymentEntity>
        {
            new() { Id = 22, OwnerId = 7, ServiceId = 13, Environment = "production", Version = "1.4.0", CommitSha = "f00ba41234", Status = "Succeeded", StartedAt = startedAt }
        }, 1));

        var result = await _service.GetHistoryAsync(7, new DeploymentHistoryQuery { ServiceId = "13", Status = " Succeeded ", Page = 1, PageSize = 20 });

        var deployment = Assert.Single(result.Items);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal("production", deployment.Environment);
        Assert.Equal("1.4.0", deployment.Version);
        Assert.Equal("f00ba41234", deployment.CommitSha);
        Assert.Equal("Succeeded", deployment.Status);
    }

    [Fact]
    public async Task GetHistoryAsync_NoFilter_ReturnsAllOwnerDeployments()
    {
        _repository.Setup(r => r.GetHistoryAsync(5, null, null, 0, 20)).ReturnsAsync((new List<DeploymentEntity>
        {
            new() { Id = 1, OwnerId = 5, ServiceId = 10, Environment = "staging", Version = "2.0.0", Status = "Pending", StartedAt = DateTime.UtcNow },
            new() { Id = 2, OwnerId = 5, ServiceId = 11, Environment = "production", Version = "1.0.0", Status = "Succeeded", StartedAt = DateTime.UtcNow }
        }, 2));

        var result = await _service.GetHistoryAsync(5, new DeploymentHistoryQuery());

        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count);
    }

    [Theory]
    [InlineData(0, 1)]   // page below 1 → clamped to 1
    [InlineData(-5, 1)]
    public async Task GetHistoryAsync_PageBelowOne_ClampedToOne(int page, int expectedPage)
    {
        _repository.Setup(r => r.GetHistoryAsync(1, null, null, 0, 20)).ReturnsAsync((new List<DeploymentEntity>(), 0));

        var result = await _service.GetHistoryAsync(1, new DeploymentHistoryQuery { Page = page });

        Assert.Equal(expectedPage, result.Page);
    }

    [Theory]
    [InlineData(200, 100)]   // page size above max → clamped to 100
    [InlineData(0, 1)]       // page size below 1 → clamped to 1
    public async Task GetHistoryAsync_PageSizeOutOfRange_IsClamped(int pageSize, int expectedPageSize)
    {
        _repository.Setup(r => r.GetHistoryAsync(1, null, null, 0, expectedPageSize)).ReturnsAsync((new List<DeploymentEntity>(), 0));

        var result = await _service.GetHistoryAsync(1, new DeploymentHistoryQuery { PageSize = pageSize });

        Assert.Equal(expectedPageSize, result.PageSize);
    }

    [Fact]
    public async Task GetHistoryAsync_StatusIsWhitespaceTrimmed_PassedToRepository()
    {
        _repository.Setup(r => r.GetHistoryAsync(1, null, "Failed", 0, 20)).ReturnsAsync((new List<DeploymentEntity>(), 0));

        await _service.GetHistoryAsync(1, new DeploymentHistoryQuery { Status = "  Failed  " });

        _repository.Verify(r => r.GetHistoryAsync(1, null, "Failed", 0, 20), Times.Once);
    }

    // ---------- GetDetailsAsync ----------

    [Fact]
    public async Task GetDetailsAsync_SuccessfulDeployment_DoesNotReturnFailureReason()
    {
        var deployment = new DeploymentEntity { Id = 5, OwnerId = 7, ServiceId = 13, Environment = "production", Version = "1.0.0", Status = "Succeeded", StartedAt = DateTime.UtcNow, FailureReason = "should be hidden" };
        _repository.Setup(r => r.GetByIdAsync(5, 7)).ReturnsAsync(deployment);
        _repository.Setup(r => r.GetLogsAsync(5)).ReturnsAsync(new List<DeploymentLogEntity>());

        var result = await _service.GetDetailsAsync(5, 7);

        Assert.NotNull(result);
        Assert.Equal("Succeeded", result!.Status);
        Assert.Null(result.FailureReason);  // hidden for non-failed deployments
    }

    [Fact]
    public async Task GetDetailsAsync_FailedDeployment_ReturnsFailureReasonAndLogs()
    {
        var deployment = new DeploymentEntity { Id = 8, OwnerId = 7, ServiceId = 13, Environment = "staging", Version = "1.5.0", Status = "Failed", StartedAt = DateTime.UtcNow, FailureReason = "Health check did not become ready." };
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

    [Fact]
    public async Task GetDetailsAsync_DeploymentWithMultipleLogs_ReturnsAllLogs()
    {
        var now = DateTime.UtcNow;
        var deployment = new DeploymentEntity { Id = 3, OwnerId = 1, ServiceId = 2, Environment = "staging", Version = "1.0.0", Status = "Failed", StartedAt = now, FailureReason = "OOM" };
        _repository.Setup(r => r.GetByIdAsync(3, 1)).ReturnsAsync(deployment);
        _repository.Setup(r => r.GetLogsAsync(3)).ReturnsAsync(new List<DeploymentLogEntity>
        {
            new() { DeploymentId = 3, Timestamp = now, Level = "Info", Message = "Starting deployment." },
            new() { DeploymentId = 3, Timestamp = now.AddSeconds(1), Level = "Error", Message = "Out of memory." }
        });

        var result = await _service.GetDetailsAsync(3, 1);

        Assert.NotNull(result);
        Assert.Equal(2, result!.Logs.Count);
    }

    // ---------- CreateAsync: Valid requests ----------

    [Fact]
    public async Task CreateAsync_ValidRequest_CreatesDeployment()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.4.0", CommitSha = "abc123" };
        const int ownerId = 7;

        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        Assert.True(result.Success);
        Assert.Null(result.Error);
        Assert.Equal(42, result.DeploymentId);

        _repository.Verify(r => r.CreateAsync(It.Is<DeploymentEntity>(d =>
            d.ServiceId == 13 && d.OwnerId == ownerId && d.Environment == "production" &&
            d.Version == "1.4.0" && d.CommitSha == "abc123" && d.Status == "Pending" &&
            d.StartedAt != default)), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_StoresCorrectInitialStatusAndTimestamp()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "staging", Version = "2.0.0" };
        const int ownerId = 7;

        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "staging")).ReturnsAsync((true, true, "Staging"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(1);

        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        Assert.True(result.Success);
        var deployedEntity = _repository.Invocations
            .Single(i => i.Method.Name == "CreateAsync")
            .Arguments[0] as DeploymentEntity;
        Assert.NotNull(deployedEntity);
        Assert.Equal("Pending", deployedEntity!.Status);
        Assert.Equal(ownerId, deployedEntity.OwnerId);
        Assert.Equal(request.ServiceId, deployedEntity.ServiceId.ToString());
        Assert.Equal(request.Environment, deployedEntity.Environment);
        Assert.Equal(request.Version, deployedEntity.Version);
        Assert.True(deployedEntity.StartedAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task CreateAsync_CommitShaIsOptional_DeploymentStillCreated()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0", CommitSha = null };

        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(5);

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.True(result.Success);
        _repository.Verify(r => r.CreateAsync(It.Is<DeploymentEntity>(d => d.CommitSha == null)), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_EnvironmentAndVersionAreWhitespaceTrimmed()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "  production  ", Version = "  1.0.0  ", CommitSha = "  abc  " };

        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(1);

        await _service.CreateAsync(request, 7, isAdmin: false);

        _repository.Verify(r => r.GetEnvironmentByNameAsync(10, "production"), Times.Once);
        _repository.Verify(r => r.CreateAsync(It.Is<DeploymentEntity>(d =>
            d.Environment == "production" && d.Version == "1.0.0" && d.CommitSha == "abc")), Times.Once);
    }

    // ---------- CreateAsync: Validation errors ----------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_MissingVersion_ReturnsValidationError(string? version)
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = version! };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Version is required.", result.Error);
        Assert.Null(result.DeploymentId);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ServiceNotFound_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ServiceId = "999", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("999")).ReturnsAsync((false, 0, false, 0, 0));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Service not found.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_ArchivedProject_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, true, 10, 0));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("Project is archived.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_EnvironmentNotFound_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "nonexistent", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "nonexistent")).ReturnsAsync(((bool Exists, bool IsActive, string Type)?)null);

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment is not valid for this project.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_InactiveEnvironment_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, false, "Production"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment is not valid for this project.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_UnsupportedEnvironmentType_ReturnsError()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "qa", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "qa")).ReturnsAsync((true, true, "QA"));

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("The selected environment type is not supported.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    // ---------- CreateAsync: Authorization ----------

    [Fact]
    public async Task CreateAsync_NonOwnerNonAdmin_ReturnsForbidden()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));

        var result = await _service.CreateAsync(request, ownerId: 99, isAdmin: false);

        Assert.False(result.Success);
        Assert.Equal("You do not have permission to deploy this service.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_AdminCanDeployToOtherUsersService()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId: 99, isAdmin: true);

        Assert.True(result.Success);
        Assert.Equal(42, result.DeploymentId);
    }

    [Fact]
    public async Task CreateAsync_OwnerCanDeployToOwnService()
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, "production")).ReturnsAsync((true, true, "Production"));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(42);

        var result = await _service.CreateAsync(request, ownerId: 7, isAdmin: false);

        Assert.True(result.Success);
        Assert.Equal(42, result.DeploymentId);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public async Task CreateAsync_AllSupportedEnvironmentTypes_Succeed(string envType)
    {
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = envType.ToLower(), Version = "1.0.0" };
        _repository.Setup(r => r.GetServiceAccessAsync("13")).ReturnsAsync((true, 7, false, 10, 0));
        _repository.Setup(r => r.GetEnvironmentByNameAsync(10, envType.ToLower())).ReturnsAsync((true, true, envType));
        _repository.Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>())).ReturnsAsync(1);

        var result = await _service.CreateAsync(request, 7, isAdmin: false);

        Assert.True(result.Success);
    }
}
