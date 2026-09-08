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
    }
}
