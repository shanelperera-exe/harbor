using System.Security.Claims;
using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Responses;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Project.Tests
{
    public class ServicesControllerTests
    {
        private readonly Mock<IServiceService> _serviceMock = new();
        private readonly ServicesController _controller;

        private const string ProjectId = "prj-abcdefghij";
        private const string ServiceId = "srv-abcdefghij";

        public ServicesControllerTests()
        {
            _controller = new ServicesController(_serviceMock.Object);
        }

        /// <summary>
        /// Attaches the same claims principal the JWT middleware would populate.
        /// A null userId simulates a token that carries no userId claim.
        /// </summary>
        private void SetUser(int? userId, string role = Roles.User)
        {
            var claims = new List<Claim>();
            if (userId is not null)
                claims.Add(new Claim("userId", userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, role));

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
                }
            };
        }

        private static CreateServiceRequest ValidCreateRequest() => new()
        {
            Name = "api",
            Type = "Backend",
            RepositoryUrl = "https://github.com/acme/api",
            RepositoryBranch = "main"
        };

        // ---------- Create ----------

        [Fact]
        public async Task Create_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.Create(ProjectId, ValidCreateRequest());

            Assert.IsType<UnauthorizedResult>(result);
            _serviceMock.Verify(
                s => s.CreateAsync(It.IsAny<string>(), It.IsAny<CreateServiceRequest>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task Create_ValidRequest_Returns201WithService()
        {
            SetUser(7);
            var request = ValidCreateRequest();
            var created = new ServiceResponse { Id = 13, PublicId = ServiceId, ProjectId = 10, Name = "api", Type = "Backend" };
            _serviceMock.Setup(s => s.CreateAsync(ProjectId, request, 7, false)).ReturnsAsync((true, null, created));

            var result = await _controller.Create(ProjectId, request);

            var objectResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(201, objectResult.StatusCode);
            var body = Assert.IsType<ApiResponse<ServiceResponse>>(objectResult.Value);
            Assert.Equal(ServiceId, body.Data!.PublicId);
            Assert.Equal("api", body.Data.Name);
        }

        [Fact]
        public async Task Create_ServiceRejectsRequest_Returns400Problem()
        {
            SetUser(7);
            var request = ValidCreateRequest();
            _serviceMock
                .Setup(s => s.CreateAsync(ProjectId, request, 7, false))
                .ReturnsAsync((false, "Service name is required.", null));

            var result = await _controller.Create(ProjectId, request);

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, problem.StatusCode);
        }

        [Fact]
        public async Task Create_NonAdminUser_PassesIsAdminFalse()
        {
            SetUser(7);
            var request = ValidCreateRequest();
            _serviceMock
                .Setup(s => s.CreateAsync(ProjectId, request, 7, false))
                .ReturnsAsync((true, null, new ServiceResponse()));

            await _controller.Create(ProjectId, request);

            _serviceMock.Verify(s => s.CreateAsync(ProjectId, request, 7, false), Times.Once);
            _serviceMock.Verify(
                s => s.CreateAsync(It.IsAny<string>(), It.IsAny<CreateServiceRequest>(), It.IsAny<int>(), true),
                Times.Never);
        }

        [Fact]
        public async Task Create_AdminUser_PassesIsAdminTrue()
        {
            SetUser(99, Roles.Admin);
            var request = ValidCreateRequest();
            _serviceMock
                .Setup(s => s.CreateAsync(ProjectId, request, 99, true))
                .ReturnsAsync((true, null, new ServiceResponse()));

            await _controller.Create(ProjectId, request);

            _serviceMock.Verify(s => s.CreateAsync(ProjectId, request, 99, true), Times.Once);
        }

        // ---------- GetByProjectId ----------

        [Fact]
        public async Task GetByProjectId_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.GetByProjectId(ProjectId);

            Assert.IsType<UnauthorizedResult>(result);
            _serviceMock.Verify(
                s => s.GetByProjectIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task GetByProjectId_Success_Returns200WithList()
        {
            SetUser(7);
            var services = new List<ServiceResponse>
            {
                new() { Id = 13, PublicId = ServiceId, Name = "api" },
                new() { Id = 14, PublicId = "srv-klmnopqrst", Name = "web" }
            };
            _serviceMock.Setup(s => s.GetByProjectIdAsync(ProjectId, 7, false)).ReturnsAsync((true, null, services));

            var result = await _controller.GetByProjectId(ProjectId);

            var ok = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<List<ServiceResponse>>>(ok.Value);
            Assert.Equal(2, body.Data!.Count);
        }

        [Fact]
        public async Task GetByProjectId_ServiceRejectsRequest_Returns400Problem()
        {
            SetUser(7);
            _serviceMock
                .Setup(s => s.GetByProjectIdAsync(ProjectId, 7, false))
                .ReturnsAsync((false, "Project not found.", null));

            var result = await _controller.GetByProjectId(ProjectId);

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, problem.StatusCode);
        }

        // ---------- GetById ----------

        [Fact]
        public async Task GetById_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.GetById(ProjectId, ServiceId);

            Assert.IsType<UnauthorizedResult>(result);
            _serviceMock.Verify(
                s => s.GetByIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task GetById_Success_Returns200WithService()
        {
            SetUser(7);
            _serviceMock
                .Setup(s => s.GetByIdAsync(ServiceId, 7, false))
                .ReturnsAsync((true, null, new ServiceResponse { Id = 13, PublicId = ServiceId, Name = "api" }));

            var result = await _controller.GetById(ProjectId, ServiceId);

            var ok = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<ServiceResponse>>(ok.Value);
            Assert.Equal("api", body.Data!.Name);
        }

        [Fact]
        public async Task GetById_NotFound_Returns404()
        {
            SetUser(7);
            _serviceMock
                .Setup(s => s.GetByIdAsync(ServiceId, 7, false))
                .ReturnsAsync((false, "Service not found.", null));

            var result = await _controller.GetById(ProjectId, ServiceId);

            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            Assert.Equal(404, notFound.StatusCode);
        }

        [Fact]
        public async Task GetById_SuccessButNullData_Returns404()
        {
            // Defensive: the controller treats a null payload as not-found even on success.
            SetUser(7);
            _serviceMock
                .Setup(s => s.GetByIdAsync(ServiceId, 7, false))
                .ReturnsAsync((true, null, null));

            var result = await _controller.GetById(ProjectId, ServiceId);

            Assert.IsType<NotFoundObjectResult>(result);
        }

        // ---------- Update ----------

        [Fact]
        public async Task Update_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.Update(ProjectId, ServiceId, new UpdateServiceRequest { Provider = "docker" });

            Assert.IsType<UnauthorizedResult>(result);
            _serviceMock.Verify(
                s => s.UpdateAsync(It.IsAny<string>(), It.IsAny<UpdateServiceRequest>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task Update_Success_Returns200WithUpdatedService()
        {
            SetUser(7);
            var request = new UpdateServiceRequest { Provider = "docker" };
            _serviceMock
                .Setup(s => s.UpdateAsync(ServiceId, request, 7, false))
                .ReturnsAsync((true, null, new ServiceResponse { Id = 13, PublicId = ServiceId, Provider = "docker" }));

            var result = await _controller.Update(ProjectId, ServiceId, request);

            var ok = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<ServiceResponse>>(ok.Value);
            Assert.Equal("docker", body.Data!.Provider);
        }

        [Fact]
        public async Task Update_ServiceNotFound_Returns404()
        {
            SetUser(7);
            _serviceMock
                .Setup(s => s.UpdateAsync(ServiceId, It.IsAny<UpdateServiceRequest>(), 7, false))
                .ReturnsAsync((false, "Service not found.", null));

            var result = await _controller.Update(ProjectId, ServiceId, new UpdateServiceRequest());

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(404, problem.StatusCode);
        }

        [Fact]
        public async Task Update_PermissionDenied_Returns400()
        {
            SetUser(99);
            _serviceMock
                .Setup(s => s.UpdateAsync(ServiceId, It.IsAny<UpdateServiceRequest>(), 99, false))
                .ReturnsAsync((false, "You do not have permission to update this service.", null));

            var result = await _controller.Update(ProjectId, ServiceId, new UpdateServiceRequest());

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, problem.StatusCode);
        }

        [Fact]
        public async Task Update_AdminUser_PassesIsAdminTrue()
        {
            SetUser(99, Roles.Admin);
            var request = new UpdateServiceRequest { Provider = "podman" };
            _serviceMock
                .Setup(s => s.UpdateAsync(ServiceId, request, 99, true))
                .ReturnsAsync((true, null, new ServiceResponse()));

            await _controller.Update(ProjectId, ServiceId, request);

            _serviceMock.Verify(s => s.UpdateAsync(ServiceId, request, 99, true), Times.Once);
        }

        // ---------- Delete ----------

        [Fact]
        public async Task Delete_NoUserIdClaim_ReturnsUnauthorized()
        {
            SetUser(userId: null);

            var result = await _controller.Delete(ProjectId, ServiceId);

            Assert.IsType<UnauthorizedResult>(result);
            _serviceMock.Verify(
                s => s.DeleteAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<bool>()),
                Times.Never);
        }

        [Fact]
        public async Task Delete_Success_Returns200()
        {
            SetUser(7);
            _serviceMock.Setup(s => s.DeleteAsync(ServiceId, 7, false)).ReturnsAsync((true, null));

            var result = await _controller.Delete(ProjectId, ServiceId);

            var ok = Assert.IsType<OkObjectResult>(result);
            var body = Assert.IsType<ApiResponse<object>>(ok.Value);
            Assert.Null(body.Data);
        }

        [Fact]
        public async Task Delete_ServiceRejectsRequest_Returns400Problem()
        {
            SetUser(7);
            _serviceMock
                .Setup(s => s.DeleteAsync(ServiceId, 7, false))
                .ReturnsAsync((false, "Failed to delete service."));

            var result = await _controller.Delete(ProjectId, ServiceId);

            var problem = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, problem.StatusCode);
        }

        [Fact]
        public async Task Delete_AdminUser_PassesIsAdminTrue()
        {
            SetUser(99, Roles.Admin);
            _serviceMock.Setup(s => s.DeleteAsync(ServiceId, 99, true)).ReturnsAsync((true, null));

            await _controller.Delete(ProjectId, ServiceId);

            _serviceMock.Verify(s => s.DeleteAsync(ServiceId, 99, true), Times.Once);
        }
    }
}
