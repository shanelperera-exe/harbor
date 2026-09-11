using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Responses;
using Harbor.Project.Services;

namespace Harbor.Project.Tests
{
    public class ProjectsControllerTests
    {
        private readonly Mock<IProjectService> _projectServiceMock;
        private readonly ProjectsController _controller;

        public ProjectsControllerTests()
        {
            _projectServiceMock = new Mock<IProjectService>();
            _controller = new ProjectsController(_projectServiceMock.Object);
        }

        // Simulates the JWT middleware attaching claims to the request,
        // the same way it would happen for a real authenticated call.
        private void SetUser(int? userId, string role = Roles.User)
        {
            var claims = new List<Claim>();
            if (userId is not null)
            {
                claims.Add(new Claim("userId", userId.Value.ToString()));
            }
            claims.Add(new Claim(ClaimTypes.Role, role));

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        // ---------- Create ----------

        [Fact]
        public async Task Create_NoUserIdClaim_ReturnsUnauthorized()
        {
            // Arrange: simulates a request with no valid userId claim (e.g. malformed/missing token)
            SetUser(userId: null);
            var request = new CreateProjectRequest { Name = "harbor-api" };

            // Act
            var result = await _controller.Create(request);

            // Assert
            Assert.IsType<UnauthorizedResult>(result);
            _projectServiceMock.Verify(s => s.CreateAsync(It.IsAny<CreateProjectRequest>(), It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task Create_ValidRequest_Returns201WithProject()
        {
            // Arrange
            SetUser(userId: 1);
            var request = new CreateProjectRequest { Name = "harbor-api" };
            var expected = new ProjectResponse { Id = 10, Name = "harbor-api", OwnerId = 1 };

            _projectServiceMock
                .Setup(s => s.CreateAsync(request, 1))
                .ReturnsAsync((true, (string?)null, expected));

            // Act
            var result = await _controller.Create(request);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(201, objectResult.StatusCode);
            var body = Assert.IsType<ApiResponse<ProjectResponse>>(objectResult.Value);
            Assert.Equal("harbor-api", body.Data!.Name);
        }

        [Fact]
        public async Task Create_InvalidRequest_Returns400WithProblemDetail()
        {
            // Arrange
            SetUser(userId: 1);
            var request = new CreateProjectRequest { Name = "" };

            _projectServiceMock
                .Setup(s => s.CreateAsync(request, 1))
                .ReturnsAsync((false, "Project name is required.", (ProjectResponse?)null));

            // Act
            var result = await _controller.Create(request);

            // Assert
            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, objectResult.StatusCode);
        }

        // ---------- GetAll ----------

        [Fact]
        public async Task GetAll_NoUserIdClaim_ReturnsUnauthorized()
        {
            // Arrange
            SetUser(userId: null);

            // Act
            var result = await _controller.GetAll();

            // Assert
            Assert.IsType<UnauthorizedResult>(result);
            _projectServiceMock.Verify(
                s => s.GetAccessibleProjectsAsync(It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
        }

        [Fact]
        public async Task GetAll_RegularUser_PassesIsAdminFalseToService()
        {
            // Arrange
            SetUser(userId: 5, role: Roles.User);
            _projectServiceMock
                .Setup(s => s.GetAccessibleProjectsAsync(5, false))
                .ReturnsAsync(new List<ProjectResponse>());

            // Act
            var result = await _controller.GetAll();

            // Assert
            Assert.IsType<OkObjectResult>(result);
            _projectServiceMock.Verify(s => s.GetAccessibleProjectsAsync(5, false), Times.Once);
        }

        [Fact]
        public async Task GetAll_AdminUser_PassesIsAdminTrueToService()
        {
            // Arrange
            SetUser(userId: 1, role: Roles.Admin);
            _projectServiceMock
                .Setup(s => s.GetAccessibleProjectsAsync(1, true))
                .ReturnsAsync(new List<ProjectResponse>
                {
                    new() { Id = 1, Name = "someone-elses-project", OwnerId = 99 }
                });

            // Act
            var result = await _controller.GetAll();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<List<ProjectResponse>>>(okResult.Value);
            Assert.Single(body.Data!);
            _projectServiceMock.Verify(s => s.GetAccessibleProjectsAsync(1, true), Times.Once);
        }

                // ---------- Update ----------

        [Fact]
        public async Task Update_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);
            var request = new UpdateProjectRequest { Name = "new-name" };

            var result = await _controller.Update(1, request);

            Assert.IsType<UnauthorizedResult>(result);
            _projectServiceMock.Verify(
                s => s.UpdateAsync(It.IsAny<int>(), It.IsAny<UpdateProjectRequest>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task Update_ValidRequest_Returns200WithProject()
        {
            SetUser(userId: 5);
            var request = new UpdateProjectRequest { Name = "renamed" };
            var expected = new ProjectResponse { Id = 1, Name = "renamed", OwnerId = 5 };

            _projectServiceMock
                .Setup(s => s.UpdateAsync(1, request, 5, false))
                .ReturnsAsync((true, (string?)null, false, expected));

            var result = await _controller.Update(1, request);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<ProjectResponse>>(okResult.Value);
            Assert.Equal("renamed", body.Data!.Name);
        }

        [Fact]
        public async Task Update_Forbidden_Returns403()
        {
            SetUser(userId: 7);
            var request = new UpdateProjectRequest { Name = "hijacked" };

            _projectServiceMock
                .Setup(s => s.UpdateAsync(1, request, 7, false))
                .ReturnsAsync((false, "You do not have permission to update this project.", true, (ProjectResponse?)null));

            var result = await _controller.Update(1, request);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        [Fact]
        public async Task Update_InvalidRequest_Returns400()
        {
            SetUser(userId: 5);
            var request = new UpdateProjectRequest { Name = "" };

            _projectServiceMock
                .Setup(s => s.UpdateAsync(1, request, 5, false))
                .ReturnsAsync((false, "Project name is required.", false, (ProjectResponse?)null));

            var result = await _controller.Update(1, request);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, objectResult.StatusCode);
        }

        // ---------- Archive ----------

        [Fact]
        public async Task Archive_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.Archive(1);

            Assert.IsType<UnauthorizedResult>(result);
            _projectServiceMock.Verify(
                s => s.ArchiveAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
        }

        [Fact]
        public async Task Archive_ValidRequest_Returns200()
        {
            SetUser(userId: 5);

            _projectServiceMock
                .Setup(s => s.ArchiveAsync(1, 5, false))
                .ReturnsAsync((true, (string?)null, false));

            var result = await _controller.Archive(1);

            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Archive_Forbidden_Returns403()
        {
            SetUser(userId: 7);

            _projectServiceMock
                .Setup(s => s.ArchiveAsync(1, 7, false))
                .ReturnsAsync((false, "You do not have permission to archive this project.", true));

            var result = await _controller.Archive(1);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(403, objectResult.StatusCode);
        }

        [Fact]
        public async Task Archive_AlreadyArchived_Returns400()
        {
            SetUser(userId: 5);

            _projectServiceMock
                .Setup(s => s.ArchiveAsync(1, 5, false))
                .ReturnsAsync((false, "Project is already archived.", false));

            var result = await _controller.Archive(1);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, objectResult.StatusCode);
        }
    }
}
