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
        _repository.Setup(r => r.GetProjectAccessAsync(10)).ReturnsAsync((true, 5, false));
        _repository.Setup(r => r.TypeExistsForProjectAsync(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(false);
        _repository.Setup(r => r.CreateAsync(It.IsAny<EnvironmentEntity>())).ReturnsAsync(42);
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public async Task CreateAsync_SupportedTypeForOwner_CreatesEnvironment(string type)
    {
        var result = await _service.CreateAsync(10, new CreateEnvironmentRequest { Name = "  primary  ", Type = type }, 5, false);

        Assert.True(result.Success);
        Assert.Equal(42, result.Data!.Id);
        Assert.Equal("primary", result.Data.Name);
        Assert.Equal(type, result.Data.Type);
        _repository.Verify(r => r.CreateAsync(It.Is<EnvironmentEntity>(e => e.ProjectId == 10 && e.Name == "primary" && e.Type == type)), Times.Once);
    }

    [Fact]
    public async Task CreateAsync_UnsupportedType_ReturnsValidationErrorWithoutPersisting()
    {
        var result = await _service.CreateAsync(10, new CreateEnvironmentRequest { Name = "test", Type = "QA" }, 5, false);

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
        var result = await _service.CreateAsync(10, new CreateEnvironmentRequest { Name = name, Type = "Development" }, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Environment name is required.", result.Error);
    }

    [Fact]
    public async Task CreateAsync_OtherUsersProject_ReturnsForbidden()
    {
        var result = await _service.CreateAsync(10, new CreateEnvironmentRequest { Name = "test", Type = "Development" }, 6, false);

        Assert.False(result.Success);
        Assert.True(result.Forbidden);
        _repository.Verify(r => r.CreateAsync(It.IsAny<EnvironmentEntity>()), Times.Never);
    }

    [Fact]
    public async Task GetByProjectAsync_AdminCanViewEnvironments()
    {
        _repository.Setup(r => r.GetByProjectIdAsync(10)).ReturnsAsync([new EnvironmentEntity { Id = 1, ProjectId = 10, Name = "production", Type = "Production" }]);

        var result = await _service.GetByProjectAsync(10, 999, true);

        Assert.True(result.Success);
        Assert.Single(result.Data!);
        Assert.Equal("Production", result.Data![0].Type);
    }
}
