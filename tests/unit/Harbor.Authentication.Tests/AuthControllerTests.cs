using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using Harbor.Authentication.Controllers;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Responses;
using Harbor.Authentication.Services;
using Microsoft.AspNetCore.Http;

namespace Harbor.Authentication.Tests
{
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _authServiceMock;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _authServiceMock = new Mock<IAuthService>();
            _controller = new AuthController(_authServiceMock.Object);
            // Setup ControllerContext for Problem details mapping
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            };
        }

        [Fact]
        public async Task Register_Success_Returns201Created()
        {
            // Arrange
            var request = new RegisterRequest { Username = "test", Email = "test@example.com", Password = "password" };
            var response = new RegisterResponse { Username = "test", Email = "test@example.com", Role = "Developer" };
            _authServiceMock.Setup(s => s.RegisterAsync(request))
                .ReturnsAsync((true, null, response));

            // Act
            var result = await _controller.Register(request);

            // Assert
            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(201, objResult.StatusCode);
            var apiResponse = Assert.IsType<ApiResponse<RegisterResponse>>(objResult.Value);
            Assert.Equal("test", apiResponse.Data?.Username);
        }

        [Fact]
        public async Task Register_Failure_Returns400BadRequest()
        {
            // Arrange
            var request = new RegisterRequest { Username = "test", Email = "test@example.com", Password = "password" };
            _authServiceMock.Setup(s => s.RegisterAsync(request))
                .ReturnsAsync((false, "User already exists", null));

            // Act
            var result = await _controller.Register(request);

            // Assert
            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(400, objResult.StatusCode);
            var problemDetails = Assert.IsType<ProblemDetails>(objResult.Value);
            Assert.Equal("User already exists", problemDetails.Detail);
        }

        [Fact]
        public async Task Login_Success_Returns200Ok()
        {
            // Arrange
            var request = new LoginRequest { Username = "test", Password = "password" };
            var response = new LoginResponse { Token = "token", Username = "test", Role = "Developer" };
            _authServiceMock.Setup(s => s.LoginAsync(request))
                .ReturnsAsync((true, null, response));

            // Act
            var result = await _controller.Login(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);
            var apiResponse = Assert.IsType<ApiResponse<LoginResponse>>(okResult.Value);
            Assert.Equal("token", apiResponse.Data?.Token);
        }

        [Fact]
        public async Task Login_Failure_Returns401Unauthorized()
        {
            // Arrange
            var request = new LoginRequest { Username = "test", Password = "wrong" };
            _authServiceMock.Setup(s => s.LoginAsync(request))
                .ReturnsAsync((false, "Invalid credentials", null));

            // Act
            var result = await _controller.Login(request);

            // Assert
            var objResult = Assert.IsType<ObjectResult>(result);
            Assert.Equal(401, objResult.StatusCode);
            var problemDetails = Assert.IsType<ProblemDetails>(objResult.Value);
            Assert.Equal("Invalid credentials", problemDetails.Detail);
        }

        [Fact]
        public async Task ForgotPassword_Success_Returns200Ok()
        {
            // Arrange
            var request = new ForgotPasswordRequest { Email = "test@example.com" };
            _authServiceMock.Setup(s => s.ForgotPasswordAsync(request))
                .ReturnsAsync((true, null));

            // Act
            var result = await _controller.ForgotPassword(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);
        }

        [Fact]
        public async Task ResetPassword_Success_Returns200Ok()
        {
            // Arrange
            var request = new ResetPasswordRequest { Email = "test@example.com", Token = "token", NewPassword = "newpassword" };
            _authServiceMock.Setup(s => s.ResetPasswordAsync(request))
                .ReturnsAsync((true, null));

            // Act
            var result = await _controller.ResetPassword(request);

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result);
            Assert.Equal(200, okResult.StatusCode);
        }
    }
}
