using Moq;
using Xunit;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Services;

namespace Harbor.Authentication.Tests
{
    public class AuthServiceTests
    {
        private readonly Mock<IUserRepository> _userRepositoryMock;
        private readonly Mock<IJwtService> _jwtServiceMock;
        private readonly AuthService _authService;

        public AuthServiceTests()
        {
            _userRepositoryMock = new Mock<IUserRepository>();
            _jwtServiceMock = new Mock<IJwtService>();
            _authService = new AuthService(_userRepositoryMock.Object, _jwtServiceMock.Object);
        }

        // ---------- RegisterAsync tests ----------

        [Fact]
        public async Task RegisterAsync_ValidData_ReturnsSuccessWithUserData()
        {
            // Arrange
            var request = new RegisterRequest
            {
                Username = "puna",
                Email = "puna@gmail.com",
                Password = "12345678"
            };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameOrEmailAsync(request.Username, request.Email))
                .ReturnsAsync((User?)null); // no existing user

            _userRepositoryMock
                .Setup(r => r.CreateUserAsync(It.IsAny<User>()))
                .ReturnsAsync(1);

            // Act
            var (success, error, data) = await _authService.RegisterAsync(request);

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(data);
            Assert.Equal("puna", data!.Username);
            Assert.Equal("puna@gmail.com", data.Email);
            Assert.Equal("Developer", data.Role);
        }

        [Theory]
        [InlineData("", "puna@gmail.com", "12345678")]
        [InlineData("puna", "", "12345678")]
        [InlineData("puna", "puna@gmail.com", "")]
        public async Task RegisterAsync_MissingRequiredField_ReturnsFailure(string username, string email, string password)
        {
            var request = new RegisterRequest { Username = username, Email = email, Password = password };

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.False(success);
            Assert.Equal("Username, email, and password are all required.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task RegisterAsync_PasswordTooShort_ReturnsFailure()
        {
            var request = new RegisterRequest { Username = "puna", Email = "puna@gmail.com", Password = "123" };

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.False(success);
            Assert.Equal("Password must be at least 8 characters.", error);
        }

        [Fact]
        public async Task RegisterAsync_InvalidEmail_ReturnsFailure()
        {
            var request = new RegisterRequest { Username = "puna", Email = "not-an-email", Password = "12345678" };

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.False(success);
            Assert.Equal("Email address is not valid.", error);
        }

        [Fact]
        public async Task RegisterAsync_DuplicateUser_ReturnsFailure()
        {
            var request = new RegisterRequest { Username = "puna", Email = "puna@gmail.com", Password = "12345678" };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameOrEmailAsync(request.Username, request.Email))
                .ReturnsAsync(new User { Username = "puna", Email = "puna@gmail.com" }); // already exists

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.False(success);
            Assert.Equal("An account with this username or email already exists.", error);
            _userRepositoryMock.Verify(r => r.CreateUserAsync(It.IsAny<User>()), Times.Never);
        }

        [Fact]
        public async Task RegisterAsync_ValidData_PasswordIsHashedNotPlainText()
        {
            var request = new RegisterRequest { Username = "puna", Email = "puna@gmail.com", Password = "12345678" };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameOrEmailAsync(request.Username, request.Email))
                .ReturnsAsync((User?)null);

            User? capturedUser = null;
            _userRepositoryMock
                .Setup(r => r.CreateUserAsync(It.IsAny<User>()))
                .Callback<User>(u => capturedUser = u)
                .ReturnsAsync(1);

            await _authService.RegisterAsync(request);

            Assert.NotNull(capturedUser);
            Assert.NotEqual("12345678", capturedUser!.PasswordHash);
            Assert.True(BCrypt.Net.BCrypt.Verify("12345678", capturedUser.PasswordHash));
        }

        // ---------- LoginAsync tests ----------

        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsTokenAndUserData()
        {
            var password = "12345678";
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
            var existingUser = new User
            {
                Id = 1,
                Username = "puna",
                Email = "puna@gmail.com",
                PasswordHash = hashedPassword,
                Role = "Developer"
            };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameAsync("puna"))
                .ReturnsAsync(existingUser);

            var expiresAt = DateTime.UtcNow.AddHours(1);
            _jwtServiceMock
                .Setup(j => j.GenerateToken(existingUser))
                .Returns(("fake-jwt-token", expiresAt));

            var request = new LoginRequest { Username = "puna", Password = password };

            var (success, error, data) = await _authService.LoginAsync(request);

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal("fake-jwt-token", data!.Token);
            Assert.Equal("puna", data.Username);
            Assert.Equal("Developer", data.Role);
        }

        [Fact]
        public async Task LoginAsync_WrongPassword_ReturnsFailure()
        {
            var hashedPassword = BCrypt.Net.BCrypt.HashPassword("correct-password");
            var existingUser = new User { Username = "puna", PasswordHash = hashedPassword };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameAsync("puna"))
                .ReturnsAsync(existingUser);

            var request = new LoginRequest { Username = "puna", Password = "wrong-password" };

            var (success, error, data) = await _authService.LoginAsync(request);

            Assert.False(success);
            Assert.Equal("Invalid username or password.", error);
            Assert.Null(data);
            _jwtServiceMock.Verify(j => j.GenerateToken(It.IsAny<User>()), Times.Never);
        }

        [Fact]
        public async Task LoginAsync_UserDoesNotExist_ReturnsFailure()
        {
            _userRepositoryMock
                .Setup(r => r.GetByUsernameAsync("ghost"))
                .ReturnsAsync((User?)null);

            var request = new LoginRequest { Username = "ghost", Password = "whatever123" };

            var (success, error, data) = await _authService.LoginAsync(request);

            Assert.False(success);
            Assert.Equal("Invalid username or password.", error);
        }

        [Theory]
        [InlineData("", "12345678")]
        [InlineData("puna", "")]
        public async Task LoginAsync_MissingCredentials_ReturnsFailure(string username, string password)
        {
            var request = new LoginRequest { Username = username, Password = password };

            var (success, error, data) = await _authService.LoginAsync(request);

            Assert.False(success);
            Assert.Equal("Username and password are required.", error);
        }


        [Fact]
        public async Task RegisterAsync_ViewerRole_ReturnsSuccessWithViewerRole()
        {
            var request = new RegisterRequest
            {
                Username = "vicky",
                Email = "vicky@gmail.com",
                Password = "12345678",
                Role = "Viewer"
            };

            _userRepositoryMock
                .Setup(r => r.GetByUsernameOrEmailAsync(request.Username, request.Email))
                .ReturnsAsync((User?)null);

            _userRepositoryMock
                .Setup(r => r.CreateUserAsync(It.IsAny<User>()))
                .ReturnsAsync(2);

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.True(success);
            Assert.Equal("Viewer", data!.Role);
        }

        [Fact]
        public async Task RegisterAsync_AdminRole_IsRejected()
        {
            var request = new RegisterRequest
            {
                Username = "hacker",
                Email = "hacker@gmail.com",
                Password = "12345678",
                Role = "Admin"
            };

            var (success, error, data) = await _authService.RegisterAsync(request);

            Assert.False(success);
            Assert.Equal("Role must be either Developer or Viewer.", error);
        }

        private Microsoft.Extensions.Configuration.IConfiguration GetTestConfiguration()
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "super_secret_test_key_123456789012345");
            return new Microsoft.Extensions.Configuration.ConfigurationBuilder().Build();
        }
    }
}
