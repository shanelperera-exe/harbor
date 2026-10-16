using Harbor.Common.Security;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Harbor.Project.Services;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class ProjectIntegrationServiceTests
{
    private readonly Mock<IProjectIntegrationRepository> _integrationRepoMock = new();
    private readonly Mock<IProjectRepository> _projectRepoMock = new();
    private readonly Mock<IHarborSecretProtector> _secretProtectorMock = new();
    private readonly ProjectIntegrationService _service;

    public ProjectIntegrationServiceTests()
    {
        _service = new ProjectIntegrationService(
            _integrationRepoMock.Object,
            _projectRepoMock.Object,
            _secretProtectorMock.Object);

        _secretProtectorMock.Setup(s => s.Protect(It.IsAny<string>()))
            .Returns<string>(plain => $"enc-{plain}");
    }

    [Fact]
    public async Task CreateAsync_ProjectNotFound_ReturnsError()
    {
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync((ProjectEntity?)null);

        var request = new CreateProjectIntegrationRequest { ProviderType = "aws", Name = "AWS Int", ProviderToken = "token" };
        var (success, error, data) = await _service.CreateAsync("p-1", request, 10, false);

        Assert.False(success);
        Assert.Equal("Project not found.", error);
        Assert.Null(data);
    }

    [Fact]
    public async Task CreateAsync_NotOwnerAndNotAdmin_ReturnsPermissionError()
    {
        var project = new ProjectEntity { Id = 1, OwnerId = 99 };
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync(project);

        var request = new CreateProjectIntegrationRequest { ProviderType = "aws", Name = "AWS Int", ProviderToken = "token" };
        var (success, error, data) = await _service.CreateAsync("p-1", request, 10, false);

        Assert.False(success);
        Assert.Contains("permission", error);
    }

    [Fact]
    public async Task CreateAsync_Success_EncryptsTokenAndReturnsResponse()
    {
        var project = new ProjectEntity { Id = 1, OwnerId = 10 };
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync(project);

        var entity = new ProjectIntegrationEntity
        {
            Id = 5,
            ProjectId = 1,
            ProviderType = "aws",
            Name = "AWS Integration",
            CreatedAt = DateTime.UtcNow
        };
        _integrationRepoMock.Setup(r => r.CreateAsync(It.IsAny<ProjectIntegrationEntity>())).ReturnsAsync(5);
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(entity);

        var request = new CreateProjectIntegrationRequest { ProviderType = "aws", Name = "AWS Integration", ProviderToken = "secret-token" };
        var (success, error, data) = await _service.CreateAsync("p-1", request, 10, false);

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("AWS Integration", data.Name);
        _secretProtectorMock.Verify(s => s.Protect("secret-token"), Times.Once);
    }

    [Fact]
    public async Task GetByProjectIdAsync_ProjectNotFound_ReturnsError()
    {
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync((ProjectEntity?)null);

        var (success, error, data) = await _service.GetByProjectIdAsync("p-1", 10, false);

        Assert.False(success);
        Assert.Equal("Project not found.", error);
    }

    [Fact]
    public async Task GetByProjectIdAsync_PermissionDenied_ReturnsError()
    {
        var project = new ProjectEntity { Id = 1, OwnerId = 99 };
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync(project);

        var (success, error, data) = await _service.GetByProjectIdAsync("p-1", 10, false);

        Assert.False(success);
        Assert.Contains("permission", error);
    }

    [Fact]
    public async Task GetByProjectIdAsync_AdminUser_ReturnsList()
    {
        var project = new ProjectEntity { Id = 1, OwnerId = 99 };
        _projectRepoMock.Setup(r => r.GetByIdOrPublicIdAsync("p-1")).ReturnsAsync(project);
        _integrationRepoMock.Setup(r => r.GetByProjectIdAsync(1))
            .ReturnsAsync(new List<ProjectIntegrationEntity>
            {
                new() { Id = 1, ProjectId = 1, Name = "Int 1", ProviderType = "gcp" }
            });

        var (success, error, data) = await _service.GetByProjectIdAsync("p-1", 10, true);

        Assert.True(success);
        Assert.NotNull(data);
        Assert.Single(data);
    }

    [Fact]
    public async Task DeleteAsync_IntegrationNotFound_ReturnsError()
    {
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync((ProjectIntegrationEntity?)null);

        var (success, error) = await _service.DeleteAsync(5, 10, false);

        Assert.False(success);
        Assert.Equal("Integration not found.", error);
    }

    [Fact]
    public async Task DeleteAsync_ProjectNotFound_ReturnsError()
    {
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new ProjectIntegrationEntity { Id = 5, ProjectId = 99 });
        _projectRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((ProjectEntity?)null);

        var (success, error) = await _service.DeleteAsync(5, 10, false);

        Assert.False(success);
        Assert.Equal("Project not found.", error);
    }

    [Fact]
    public async Task DeleteAsync_PermissionDenied_ReturnsError()
    {
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new ProjectIntegrationEntity { Id = 5, ProjectId = 99 });
        _projectRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync(new ProjectEntity { Id = 99, OwnerId = 123 });

        var (success, error) = await _service.DeleteAsync(5, 10, false);

        Assert.False(success);
        Assert.Contains("permission", error);
    }

    [Fact]
    public async Task DeleteAsync_RepoDeleteFails_ReturnsError()
    {
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new ProjectIntegrationEntity { Id = 5, ProjectId = 99 });
        _projectRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync(new ProjectEntity { Id = 99, OwnerId = 10 });
        _integrationRepoMock.Setup(r => r.DeleteAsync(5)).ReturnsAsync(false);

        var (success, error) = await _service.DeleteAsync(5, 10, false);

        Assert.False(success);
        Assert.Equal("Failed to delete integration.", error);
    }

    [Fact]
    public async Task DeleteAsync_Success_ReturnsTrue()
    {
        _integrationRepoMock.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(new ProjectIntegrationEntity { Id = 5, ProjectId = 99 });
        _projectRepoMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync(new ProjectEntity { Id = 99, OwnerId = 10 });
        _integrationRepoMock.Setup(r => r.DeleteAsync(5)).ReturnsAsync(true);

        var (success, error) = await _service.DeleteAsync(5, 10, false);

        Assert.True(success);
        Assert.Null(error);
    }
}
