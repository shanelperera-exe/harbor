using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Repositories;
using Harbor.Environment.Services;
using Moq;
using Xunit;

namespace Harbor.Environment.Tests;

public class EnvironmentServiceTests
{
    private readonly Mock<IEnvironmentRepository> _repository = new();
    private readonly EnvironmentService _service;

    public EnvironmentServiceTests()
    {
        _service = new EnvironmentService(_repository.Object);
        _repository.Setup(r => r.GetProjectAccessAsync("10")).ReturnsAsync((true, 5, 0, false));
        _repository.Setup(r => r.TypeExistsForProjectAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int?>())).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(It.IsAny<EnvironmentEntity>())).ReturnsAsync(42);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public async Task CreateAsync_SupportedTypeForOwner_CreatesEnvironment(string type)
    {
        var result = await _service.CreateAsync("10", new CreateEnvironmentRequest { Name = "  primary  ", Type = type }, 5, false);

        Assert.True(result.Success);
        Assert.Equal(42, result.Data!.Id);
        Assert.Equal("primary", result.Data.Name);
        Assert.Equal(type, result.Data.Type);
        _repository.Verify(r => r.CreateAsync(It.Is<EnvironmentEntity>(e => e.ProjectId == 10 && e.Name == "primary" && e.Type == type)), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_UnsupportedType_ReturnsValidationErrorWithoutPersisting()
    {
        var result = await _service.CreateAsync("10", new CreateEnvironmentRequest { Name = "test", Type = "QA" }, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Environment type must be Development, Staging, or Production.", result.Error);
        _repository.Verify(r => r.CreateAsync(It.IsAny<EnvironmentEntity>()), Times.Never);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateAsync_MissingName_ReturnsValidationError(string? name)
    {
        var result = await _service.CreateAsync("10", new CreateEnvironmentRequest { Name = name, Type = "Development" }, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Environment name is required.", result.Error);
    }

    [Fact]
    public async Task CreateAsync_OtherUsersProject_ReturnsForbidden()
    {
        var result = await _service.CreateAsync("10", new CreateEnvironmentRequest { Name = "test", Type = "Development" }, 6, false);

        Assert.False(result.Success);
        Assert.True(result.Forbidden);
        _repository.Verify(r => r.CreateAsync(It.IsAny<EnvironmentEntity>()), Times.Never);
    }

    [Fact]
    public async Task GetByProjectAsync_AdminCanViewEnvironments()
    {
        _repository.Setup(r => r.GetByProjectIdAsync(10)).ReturnsAsync([new EnvironmentEntity { Id = 1, ProjectId = 10, Name = "production", Type = "Production" }]);

        var result = await _service.GetByProjectAsync("10", 999, true);

        Assert.True(result.Success);
        Assert.Single(result.Data!);
        Assert.Equal("Production", result.Data![0].Type);
    }

    [Fact]
    public async Task UpdateAsync_ValidOwnerRequest_UpdatesEnvironment()
    {
        _repository.Setup(r => r.GetByIdAsync(42, 10)).ReturnsAsync(new EnvironmentEntity { Id = 42, ProjectId = 10, Name = "old", Type = "Development", IsActive = true });
        _repository.Setup(r => r.UpdateAsync(It.IsAny<EnvironmentEntity>())).ReturnsAsync(true);

        var result = await _service.UpdateAsync("10", 42, new UpdateEnvironmentRequest { Name = "  primary  ", Type = "Staging" }, 5, false);

        Assert.True(result.Success);
        Assert.Equal("primary", result.Data!.Name);
        Assert.Equal("Staging", result.Data.Type);
        _repository.Verify(r => r.TypeExistsForProjectAsync(10, "Staging", 42), Times.Once);
        _repository.Verify(r => r.UpdateAsync(It.Is<EnvironmentEntity>(e => e.Name == "primary" && e.Type == "Staging")), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_RenameWithDeploymentHistory_ReturnsValidationErrorWithoutUpdating()
    {
        _repository.Setup(r => r.GetByIdAsync(42, 10)).ReturnsAsync(new EnvironmentEntity { Id = 42, ProjectId = 10, Name = "production", Type = "Production", IsActive = true });
        _repository.Setup(r => r.HasDeploymentHistoryAsync(10, "production")).ReturnsAsync(true);

        var result = await _service.UpdateAsync("10", 42, new UpdateEnvironmentRequest { Name = "live", Type = "Production" }, 5, false);

        Assert.False(result.Success);
        Assert.Contains("cannot be renamed", result.Error!);
        _repository.Verify(r => r.UpdateAsync(It.IsAny<EnvironmentEntity>()), Times.Never);
    }

    [Fact]
    public async Task RemoveAsync_EnvironmentWithDeploymentHistory_DeactivatesInsteadOfDeleting()
    {
        _repository.Setup(r => r.GetByIdAsync(42, 10)).ReturnsAsync(new EnvironmentEntity { Id = 42, ProjectId = 10, Name = "production", Type = "Production", IsActive = true });
        _repository.Setup(r => r.HasDeploymentHistoryAsync(10, "production")).ReturnsAsync(true);
        _repository.Setup(r => r.DeactivateAsync(42, 10, It.IsAny<DateTime>())).ReturnsAsync(true);

        var result = await _service.RemoveAsync("10", 42, 5, false);

        Assert.True(result.Success);
        Assert.True(result.Data!.Deactivated);
        Assert.Contains("deployment history", result.Data.Message);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task RemoveAsync_UnusedEnvironment_DeletesEnvironment()
    {
        _repository.Setup(r => r.GetByIdAsync(42, 10)).ReturnsAsync(new EnvironmentEntity { Id = 42, ProjectId = 10, Name = "staging", Type = "Staging", IsActive = true });
        _repository.Setup(r => r.DeleteAsync(42, 10)).ReturnsAsync(true);

        var result = await _service.RemoveAsync("10", 42, 5, false);

        Assert.True(result.Success);
        Assert.False(result.Data!.Deactivated);
        _repository.Verify(r => r.DeleteAsync(42, 10), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_OtherUsersProject_ReturnsForbidden()
    {
        var result = await _service.RemoveAsync("10", 42, 6, false);

        Assert.False(result.Success);
        Assert.True(result.Forbidden);
        _repository.Verify(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }
}
