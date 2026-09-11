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

                // ---------- UpdateAsync: Scenario 1 - Update project (valid data) ----------

        [Fact]
        public async Task UpdateAsync_ValidData_ReturnsSuccessWithUpdatedProject()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = 5, CreatedAt = DateTime.UtcNow };
            var request = new UpdateProjectRequest { Name = "new-name", Description = "updated desc" };

            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.NameExistsForOwnerAsync("new-name", 5)).ReturnsAsync(false);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(true);
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1))
                .ReturnsAsync(existing)
                .ReturnsAsync(new ProjectEntity { Id = 1, Name = "new-name", Description = "updated desc", OwnerId = 5, UpdatedAt = DateTime.UtcNow });

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 5, isAdmin: false);

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.False(forbidden);
            Assert.Equal("new-name", data!.Name);
        }

        [Fact]
        public async Task UpdateAsync_ProjectNotFound_ReturnsFailureNotForbidden()
        {
            // Arrange
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((ProjectEntity?)null);
            var request = new UpdateProjectRequest { Name = "any-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(99, request, userId: 1, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.Equal("Project not found.", error);
            Assert.False(forbidden);
            Assert.Null(data);
        }

        // ---------- UpdateAsync: Scenario 3 - Unauthorized update ----------

        [Fact]
        public async Task UpdateAsync_NonOwnerNonAdmin_ReturnsForbidden()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "someone-elses", OwnerId = 5, CreatedAt = DateTime.UtcNow };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = "hijacked-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 7, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.True(forbidden);
            Assert.Equal("You do not have permission to update this project.", error);
            Assert.Null(data);
            _projectRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        [Fact]
        public async Task UpdateAsync_AdminNonOwner_IsAllowed()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "someone-elses", OwnerId = 5, CreatedAt = DateTime.UtcNow };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.NameExistsForOwnerAsync(It.IsAny<string>(), 5)).ReturnsAsync(false);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(true);
            var request = new UpdateProjectRequest { Name = "admin-edited-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 999, isAdmin: true);

            // Assert
            Assert.True(success);
            Assert.False(forbidden);
        }

        [Fact]
        public async Task UpdateAsync_ArchivedProject_ReturnsValidationError()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "old", OwnerId = 5, IsArchived = true };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 5, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Archived projects cannot be updated.", error);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("ab")]
        public async Task UpdateAsync_InvalidName_ReturnsValidationError(string? name)
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "old", OwnerId = 5 };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = name! };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 5, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            _projectRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        // ---------- ArchiveAsync: Scenario 2 - Archive project ----------

        [Fact]
        public async Task ArchiveAsync_Owner_ArchivesSuccessfully()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "to-archive", OwnerId = 5, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.ArchiveAsync(1, It.IsAny<DateTime>())).ReturnsAsync(true);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId: 5, isAdmin: false);

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.False(forbidden);
            _projectRepositoryMock.Verify(r => r.ArchiveAsync(1, It.IsAny<DateTime>()), Times.Once);
        }

        [Fact]
        public async Task ArchiveAsync_AlreadyArchived_ReturnsValidationError()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "already-archived", OwnerId = 5, IsArchived = true };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId: 5, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project is already archived.", error);
            _projectRepositoryMock.Verify(r => r.ArchiveAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
        }

        // ---------- ArchiveAsync: Scenario 3 - Unauthorized archive ----------

        [Fact]
        public async Task ArchiveAsync_NonOwnerNonAdmin_ReturnsForbidden()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "not-yours", OwnerId = 5, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId: 7, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.True(forbidden);
            Assert.Equal("You do not have permission to archive this project.", error);
            _projectRepositoryMock.Verify(r => r.ArchiveAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
        }

        [Fact]
        public async Task ArchiveAsync_ProjectNotFound_ReturnsFailureNotForbidden()
        {
            // Arrange
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((ProjectEntity?)null);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(99, userId: 1, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project not found.", error);
        }
    }
}
