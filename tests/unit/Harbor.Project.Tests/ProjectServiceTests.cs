using Moq;
using Xunit;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Harbor.Project.Services;

namespace Harbor.Project.Tests
{
    public class ProjectServiceTests
    {
        private readonly Mock<IProjectRepository> _projectRepositoryMock;
        private readonly ProjectService _projectService;

        public ProjectServiceTests()
        {
            _projectRepositoryMock = new Mock<IProjectRepository>();
            _projectService = new ProjectService(_projectRepositoryMock.Object);
        }

        // ---------- CreateAsync: Scenario 1 - Create project (valid data) ----------

        [Fact]
        public async Task CreateAsync_ValidData_ReturnsSuccessWithProjectData()
        {
            // Arrange
            var request = new CreateProjectRequest
            {
                Name = "harbor-api",
                Description = "Backend API for Harbor",
                RepositoryUrl = "https://github.com/team/harbor-api"
            };
            const int ownerId = 1;

            _projectRepositoryMock
                .Setup(r => r.NameExistsForOwnerAsync(request.Name, ownerId))
                .ReturnsAsync(false);

            _projectRepositoryMock
                .Setup(r => r.CreateAsync(It.IsAny<ProjectEntity>()))
                .ReturnsAsync(42);

            // Act
            var (success, error, data) = await _projectService.CreateAsync(request, ownerId);

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(data);
            Assert.Equal(42, data!.Id);
            Assert.Equal("harbor-api", data.Name);
            Assert.Equal(ownerId, data.OwnerId);

            _projectRepositoryMock.Verify(
                r => r.CreateAsync(It.Is<ProjectEntity>(p => p.Name == "harbor-api" && p.OwnerId == ownerId)),
                Times.Once);
        }

        [Fact]
        public async Task CreateAsync_TrimsWhitespaceFromInput()
        {
            // Arrange
            var request = new CreateProjectRequest
            {
                Name = "  harbor-api  ",
                Description = "  some description  ",
                RepositoryUrl = "  https://github.com/team/harbor-api  "
            };

            _projectRepositoryMock
                .Setup(r => r.NameExistsForOwnerAsync("harbor-api", 1))
                .ReturnsAsync(false);

            _projectRepositoryMock
                .Setup(r => r.CreateAsync(It.IsAny<ProjectEntity>()))
                .ReturnsAsync(1);

            // Act
            var (success, _, data) = await _projectService.CreateAsync(request, 1);

            // Assert
            Assert.True(success);
            Assert.Equal("harbor-api", data!.Name);
            Assert.Equal("some description", data.Description);
            Assert.Equal("https://github.com/team/harbor-api", data.RepositoryUrl);
        }

        // ---------- CreateAsync: Scenario 3 - Invalid project data ----------

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CreateAsync_MissingName_ReturnsValidationError(string? name)
        {
            // Arrange
            var request = new CreateProjectRequest { Name = name! };

            // Act
            var (success, error, data) = await _projectService.CreateAsync(request, 1);

            // Assert
            Assert.False(success);
            Assert.Equal("Project name is required.", error);
            Assert.Null(data);

            _projectRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        [Theory]
        [InlineData("ab")]      // below 3-char minimum
        [InlineData("a")]
        public async Task CreateAsync_NameTooShort_ReturnsValidationError(string name)
        {
            var request = new CreateProjectRequest { Name = name };

            var (success, error, data) = await _projectService.CreateAsync(request, 1);

            Assert.False(success);
            Assert.Equal("Project name must be between 3 and 100 characters.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task CreateAsync_NameTooLong_ReturnsValidationError()
        {
            var request = new CreateProjectRequest { Name = new string('a', 101) };

            var (success, error, data) = await _projectService.CreateAsync(request, 1);

            Assert.False(success);
            Assert.Equal("Project name must be between 3 and 100 characters.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task CreateAsync_DescriptionTooLong_ReturnsValidationError()
        {
            var request = new CreateProjectRequest
            {
                Name = "valid-name",
                Description = new string('d', 501)
            };

            var (success, error, data) = await _projectService.CreateAsync(request, 1);

            Assert.False(success);
            Assert.Equal("Description cannot exceed 500 characters.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task CreateAsync_DuplicateNameForOwner_ReturnsValidationError()
        {
            // Arrange
            var request = new CreateProjectRequest { Name = "harbor-api" };

            _projectRepositoryMock
                .Setup(r => r.NameExistsForOwnerAsync("harbor-api", 1))
                .ReturnsAsync(true);

            // Act
            var (success, error, data) = await _projectService.CreateAsync(request, 1);

            // Assert
            Assert.False(success);
            Assert.Equal("You already have a project with this name.", error);
            Assert.Null(data);

            _projectRepositoryMock.Verify(r => r.CreateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        // ---------- GetAccessibleProjectsAsync: Scenario 2 - View projects ----------

        [Fact]
        public async Task GetAccessibleProjectsAsync_NonAdmin_ReturnsOnlyOwnedProjects()
        {
            // Arrange
            const int userId = 5;
            var ownedProjects = new List<ProjectEntity>
            {
                new() { Id = 1, Name = "my-project", OwnerId = userId, CreatedAt = DateTime.UtcNow }
            };

            _projectRepositoryMock
                .Setup(r => r.GetByOwnerAsync(userId))
                .ReturnsAsync(ownedProjects);

            // Act
            var result = await _projectService.GetAccessibleProjectsAsync(userId, isAdmin: false);

            // Assert
            Assert.Single(result);
            Assert.Equal("my-project", result[0].Name);
            _projectRepositoryMock.Verify(r => r.GetByOwnerAsync(userId), Times.Once);
            _projectRepositoryMock.Verify(r => r.GetAllAsync(), Times.Never);
        }

        [Fact]
        public async Task GetAccessibleProjectsAsync_Admin_ReturnsAllProjects()
        {
            // Arrange
            var allProjects = new List<ProjectEntity>
            {
                new() { Id = 1, Name = "project-a", OwnerId = 1, CreatedAt = DateTime.UtcNow },
                new() { Id = 2, Name = "project-b", OwnerId = 2, CreatedAt = DateTime.UtcNow }
            };

            _projectRepositoryMock
                .Setup(r => r.GetAllAsync())
                .ReturnsAsync(allProjects);

            // Act
            var result = await _projectService.GetAccessibleProjectsAsync(userId: 1, isAdmin: true);

            // Assert
            Assert.Equal(2, result.Count);
            _projectRepositoryMock.Verify(r => r.GetAllAsync(), Times.Once);
            _projectRepositoryMock.Verify(r => r.GetByOwnerAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task GetAccessibleProjectsAsync_NoProjects_ReturnsEmptyList()
        {
            // Arrange
            _projectRepositoryMock
                .Setup(r => r.GetByOwnerAsync(It.IsAny<int>()))
                .ReturnsAsync(new List<ProjectEntity>());

            // Act
            var result = await _projectService.GetAccessibleProjectsAsync(1, isAdmin: false);

            // Assert
            Assert.NotNull(result);
            Assert.Empty(result);
        }
    }
}
