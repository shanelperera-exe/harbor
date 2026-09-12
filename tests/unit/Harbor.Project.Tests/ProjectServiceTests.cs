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

        // ---------- UpdateAsync: Scenario 1 - Update project ----------

        [Fact]
        public async Task UpdateAsync_ValidData_OwnerUpdatesOwnProject_ReturnsSuccess()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity
            {
                Id = 1,
                Name = "old-name",
                Description = "old description",
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            };
            var request = new UpdateProjectRequest { Name = "new-name", Description = "new description" };

            _projectRepositoryMock
                .Setup(r => r.NameExistsForOwnerAsync("new-name", userId))
                .ReturnsAsync(false);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(true);

            var updated = new ProjectEntity
            {
                Id = 1,
                Name = "new-name",
                Description = "new description",
                OwnerId = userId,
                CreatedAt = existing.CreatedAt,
                IsArchived = false
            };
            _projectRepositoryMock.SetupSequence(r => r.GetByIdAsync(1))
                .ReturnsAsync(existing)
                .ReturnsAsync(updated);

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.True(success);
            Assert.False(forbidden);
            Assert.Null(error);
            Assert.NotNull(data);
            Assert.Equal("new-name", data!.Name);
            Assert.Equal("new description", data.Description);

            _projectRepositoryMock.Verify(
                r => r.UpdateAsync(It.Is<ProjectEntity>(p => p.Name == "new-name" && p.Description == "new description")),
                Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_KeepingSameName_DoesNotTriggerDuplicateCheck()
        {
            // Arrange: user re-submits the same name they already have (different casing) with an edited description
            const int userId = 10;
            var existing = new ProjectEntity
            {
                Id = 1,
                Name = "harbor-api",
                Description = "old description",
                OwnerId = userId,
                CreatedAt = DateTime.UtcNow,
                IsArchived = false
            };
            var request = new UpdateProjectRequest { Name = "Harbor-API", Description = "updated description" };

            _projectRepositoryMock.SetupSequence(r => r.GetByIdAsync(1))
                .ReturnsAsync(existing)
                .ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(true);

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.True(success);
            _projectRepositoryMock.Verify(r => r.NameExistsForOwnerAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task UpdateAsync_ProjectNotFound_ReturnsError()
        {
            // Arrange
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((ProjectEntity?)null);
            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(999, request, userId: 1, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project not found.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task UpdateAsync_ArchivedProject_ReturnsError()
        {
            // Arrange
            const int userId = 10;
            var archived = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = userId, IsArchived = true };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(archived);
            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Archived projects cannot be updated.", error);
            Assert.Null(data);

            _projectRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("  ")]
        public async Task UpdateAsync_MissingName_ReturnsValidationError(string? name)
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = name! };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project name is required.", error);
        }

        [Fact]
        public async Task UpdateAsync_DescriptionTooLong_ReturnsValidationError()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = "old-name", Description = new string('d', 501) };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.Equal("Description cannot exceed 500 characters.", error);
        }

        [Fact]
        public async Task UpdateAsync_DuplicateNameForOwner_ReturnsValidationError()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.NameExistsForOwnerAsync("taken-name", userId)).ReturnsAsync(true);
            var request = new UpdateProjectRequest { Name = "taken-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.Equal("You already have a project with this name.", error);

            _projectRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        [Fact]
        public async Task UpdateAsync_Admin_CanUpdateOtherUsersProject_ReturnsSuccess()
        {
            // Arrange
            const int ownerId = 10;
            const int adminId = 99;
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = ownerId, IsArchived = false };
            var refreshed = new ProjectEntity { Id = 1, Name = "new-name", OwnerId = ownerId, IsArchived = false };

            _projectRepositoryMock.SetupSequence(r => r.GetByIdAsync(1))
                .ReturnsAsync(existing)
                .ReturnsAsync(refreshed);
            _projectRepositoryMock.Setup(r => r.NameExistsForOwnerAsync("new-name", ownerId)).ReturnsAsync(false);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(true);

            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, adminId, isAdmin: true);

            // Assert
            Assert.True(success);
            Assert.False(forbidden);
            Assert.Equal(ownerId, data!.OwnerId);
        }

        [Fact]
        public async Task UpdateAsync_RepositoryReportsFailure_ReturnsError()
        {
            // Arrange: e.g. the project got archived by someone else between the read and the write
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.NameExistsForOwnerAsync("new-name", userId)).ReturnsAsync(false);
            _projectRepositoryMock.Setup(r => r.UpdateAsync(It.IsAny<ProjectEntity>())).ReturnsAsync(false);

            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project could not be updated. It may have been archived.", error);
            Assert.Null(data);
        }

        // ---------- UpdateAsync: Scenario 3 - Unauthorized update ----------

        [Fact]
        public async Task UpdateAsync_NonOwnerNonAdmin_ReturnsForbidden()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "old-name", OwnerId = 10, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            var request = new UpdateProjectRequest { Name = "new-name" };

            // Act: userId 20 does not own this project and is not an Admin
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(1, request, userId: 20, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.True(forbidden);
            Assert.Equal("You do not have permission to update this project.", error);
            Assert.Null(data);

            _projectRepositoryMock.Verify(r => r.UpdateAsync(It.IsAny<ProjectEntity>()), Times.Never);
        }

        // ---------- ArchiveAsync: Scenario 2 - Archive project ----------

        [Fact]
        public async Task ArchiveAsync_OwnerArchivesOwnProject_ReturnsSuccess()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "my-project", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock
                .Setup(r => r.ArchiveAsync(1, It.IsAny<DateTime>()))
                .ReturnsAsync(true);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId, isAdmin: false);

            // Assert
            Assert.True(success);
            Assert.False(forbidden);
            Assert.Null(error);

            _projectRepositoryMock.Verify(r => r.ArchiveAsync(1, It.IsAny<DateTime>()), Times.Once);
        }

        [Fact]
        public async Task ArchiveAsync_ProjectNotFound_ReturnsError()
        {
            // Arrange
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((ProjectEntity?)null);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(999, userId: 1, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project not found.", error);
        }

        [Fact]
        public async Task ArchiveAsync_AlreadyArchived_ReturnsError()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "my-project", OwnerId = userId, IsArchived = true };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project is already archived.", error);

            _projectRepositoryMock.Verify(r => r.ArchiveAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
        }

        [Fact]
        public async Task ArchiveAsync_Admin_CanArchiveOtherUsersProject_ReturnsSuccess()
        {
            // Arrange
            const int ownerId = 10;
            const int adminId = 99;
            var existing = new ProjectEntity { Id = 1, Name = "my-project", OwnerId = ownerId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.ArchiveAsync(1, It.IsAny<DateTime>())).ReturnsAsync(true);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, adminId, isAdmin: true);

            // Assert
            Assert.True(success);
            Assert.False(forbidden);
        }

        [Fact]
        public async Task ArchiveAsync_RepositoryReportsFailure_ReturnsError()
        {
            // Arrange
            const int userId = 10;
            var existing = new ProjectEntity { Id = 1, Name = "my-project", OwnerId = userId, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);
            _projectRepositoryMock.Setup(r => r.ArchiveAsync(1, It.IsAny<DateTime>())).ReturnsAsync(false);

            // Act
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.False(forbidden);
            Assert.Equal("Project could not be archived.", error);
        }

        // ---------- ArchiveAsync: Scenario 3 - Unauthorized archive ----------

        [Fact]
        public async Task ArchiveAsync_NonOwnerNonAdmin_ReturnsForbidden()
        {
            // Arrange
            var existing = new ProjectEntity { Id = 1, Name = "my-project", OwnerId = 10, IsArchived = false };
            _projectRepositoryMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(existing);

            // Act: userId 20 does not own this project and is not an Admin
            var (success, error, forbidden) = await _projectService.ArchiveAsync(1, userId: 20, isAdmin: false);

            // Assert
            Assert.False(success);
            Assert.True(forbidden);
            Assert.Equal("You do not have permission to archive this project.", error);

            _projectRepositoryMock.Verify(r => r.ArchiveAsync(It.IsAny<int>(), It.IsAny<DateTime>()), Times.Never);
        }
    }
}