using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using Harbor.Authentication.Controllers;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Responses;
using Harbor.Authentication.Services;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace Harbor.Authentication.Tests
{
    public class AuthControllerTests
    {
        private readonly Mock<IAuthService> _authServiceMock;
        private readonly Mock<IUserRepository> _userRepoMock;
        private readonly Mock<IEncryptionService> _encryptionServiceMock;
        private readonly Mock<IGitHubAppApiClient> _appClientMock;
        private readonly Mock<IExternalAuthService> _externalAuthServiceMock;
        private readonly Mock<IGitHubAppAuthService> _gitHubAppAuthServiceMock;
        private readonly AuthController _controller;

        public AuthControllerTests()
        {
            _authServiceMock = new Mock<IAuthService>();
            _userRepoMock = new Mock<IUserRepository>();
            _encryptionServiceMock = new Mock<IEncryptionService>();
            _appClientMock = new Mock<IGitHubAppApiClient>();
            _externalAuthServiceMock = new Mock<IExternalAuthService>();
            _gitHubAppAuthServiceMock = new Mock<IGitHubAppAuthService>();
            _controller = new AuthController(
                _authServiceMock.Object,
                _userRepoMock.Object,
                _encryptionServiceMock.Object,
                _appClientMock.Object,
                Options.Create(new GitHubAppOptions()),
                _externalAuthServiceMock.Object,
                _gitHubAppAuthServiceMock.Object);
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

        private void SetUser(params System.Security.Claims.Claim[] claims)
        {
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new System.Security.Claims.ClaimsPrincipal(
                        new System.Security.Claims.ClaimsIdentity(claims, claims.Length > 0 ? "mock" : null))
                }
            };
        }

        private static System.Security.Claims.Claim Uid(string v = "5") => new("userId", v);

        [Fact]
        public async Task ForgotPassword_Failure_Returns400()
        {
            var request = new ForgotPasswordRequest { Email = "x@example.com" };
            _authServiceMock.Setup(s => s.ForgotPasswordAsync(request)).ReturnsAsync((false, "bad"));
            var result = await _controller.ForgotPassword(request);
            Assert.Equal(400, Assert.IsType<ObjectResult>(result).StatusCode);
        }

        [Fact]
        public async Task ResetPassword_Failure_Returns400()
        {
            var request = new ResetPasswordRequest { Email = "x@example.com", Token = "t", NewPassword = "p" };
            _authServiceMock.Setup(s => s.ResetPasswordAsync(request)).ReturnsAsync((false, "bad"));
            var result = await _controller.ResetPassword(request);
            Assert.Equal(400, Assert.IsType<ObjectResult>(result).StatusCode);
        }

        [Fact]
        public async Task Logout_NoClaims_ReturnsOkWithoutBlacklisting()
        {
            SetUser();
            var result = await _controller.Logout();
            Assert.IsType<OkObjectResult>(result);
            _authServiceMock.Verify(s => s.LogoutAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task Logout_ExpiredToken_DoesNotBlacklist()
        {
            var past = DateTimeOffset.UtcNow.AddMinutes(-5).ToUnixTimeSeconds().ToString();
            SetUser(new("jti", "abc"), new("exp", past));
            await _controller.Logout();
            _authServiceMock.Verify(s => s.LogoutAsync(It.IsAny<string>(), It.IsAny<TimeSpan>()), Times.Never);
        }

        [Fact]
        public async Task Logout_ValidToken_Blacklists()
        {
            var future = DateTimeOffset.UtcNow.AddMinutes(30).ToUnixTimeSeconds().ToString();
            SetUser(new("jti", "abc"), new("exp", future));
            await _controller.Logout();
            _authServiceMock.Verify(s => s.LogoutAsync("abc", It.IsAny<TimeSpan>()), Times.Once);
        }

        [Fact]
        public async Task ChangePassword_NoUser_ReturnsUnauthorized()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.ChangePassword(new ChangePasswordRequest()));
        }

        [Fact]
        public async Task ChangePassword_Failure_Returns400()
        {
            SetUser(Uid());
            var req = new ChangePasswordRequest();
            _authServiceMock.Setup(s => s.ChangePasswordAsync(5, req)).ReturnsAsync((false, "bad"));
            Assert.Equal(400, Assert.IsType<ObjectResult>(await _controller.ChangePassword(req)).StatusCode);
        }

        [Fact]
        public async Task ChangePassword_Success_ReturnsOk()
        {
            SetUser(Uid());
            var req = new ChangePasswordRequest();
            _authServiceMock.Setup(s => s.ChangePasswordAsync(5, req)).ReturnsAsync((true, null));
            Assert.IsType<OkObjectResult>(await _controller.ChangePassword(req));
        }

        [Fact]
        public async Task GetProfile_NoUser_ReturnsUnauthorized()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.GetProfile());
        }

        [Fact]
        public async Task GetProfile_NotFound_Returns404()
        {
            SetUser(Uid());
            _authServiceMock.Setup(s => s.GetProfileAsync(5)).ReturnsAsync((false, "nope", null));
            Assert.IsType<NotFoundObjectResult>(await _controller.GetProfile());
        }

        [Fact]
        public async Task GetProfile_Success_ReturnsOk()
        {
            SetUser(Uid());
            _authServiceMock.Setup(s => s.GetProfileAsync(5)).ReturnsAsync((true, null, new ProfileResponse()));
            Assert.IsType<OkObjectResult>(await _controller.GetProfile());
        }

        [Fact]
        public async Task UpdateProfile_AllBranches()
        {
            var req = new ProfileRequest();
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.UpdateProfile(req));

            SetUser(Uid());
            _authServiceMock.Setup(s => s.UpdateProfileAsync(5, req)).ReturnsAsync((false, "bad", null));
            Assert.Equal(400, Assert.IsType<ObjectResult>(await _controller.UpdateProfile(req)).StatusCode);

            _authServiceMock.Setup(s => s.UpdateProfileAsync(5, req)).ReturnsAsync((true, null, new ProfileResponse()));
            Assert.IsType<OkObjectResult>(await _controller.UpdateProfile(req));
        }

        [Fact]
        public async Task UpdatePreferences_AllBranches()
        {
            var req = new AccountPreferencesRequest();
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.UpdatePreferences(req));

            SetUser(Uid());
            _authServiceMock.Setup(s => s.UpdatePreferencesAsync(5, req)).ReturnsAsync((false, "bad", null));
            Assert.Equal(400, Assert.IsType<ObjectResult>(await _controller.UpdatePreferences(req)).StatusCode);

            _authServiceMock.Setup(s => s.UpdatePreferencesAsync(5, req)).ReturnsAsync((true, null, new AccountPreferencesResponse()));
            Assert.IsType<OkObjectResult>(await _controller.UpdatePreferences(req));
        }

        [Fact]
        public async Task UnlinkExternalLogin_AllBranches()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.UnlinkExternalLogin("github"));

            SetUser(Uid("10"));
            _authServiceMock.Setup(s => s.UnlinkExternalLoginAsync(10, "github")).ReturnsAsync((false, "err", null));
            var badResult = await _controller.UnlinkExternalLogin("github");
            Assert.Equal(400, Assert.IsType<ObjectResult>(badResult).StatusCode);

            _authServiceMock.Setup(s => s.UnlinkExternalLoginAsync(10, "github")).ReturnsAsync((true, null, new ProfileResponse()));
            var okResult = await _controller.UnlinkExternalLogin("github");
            Assert.IsType<OkObjectResult>(okResult);
        }

        [Fact]
        public async Task DeleteAccount_AllBranches()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.DeleteAccount());

            SetUser(Uid("10"));
            _authServiceMock.Setup(s => s.DeleteAccountAsync(10)).ReturnsAsync((false, "cannot delete"));
            var badResult = await _controller.DeleteAccount();
            Assert.Equal(400, Assert.IsType<ObjectResult>(badResult).StatusCode);

            _authServiceMock.Setup(s => s.DeleteAccountAsync(10)).ReturnsAsync((true, null));
            var okResult = await _controller.DeleteAccount();
            Assert.IsType<OkObjectResult>(okResult);
        }

        [Fact]
        public async Task RefreshGitHubInstallation_AllBranches()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.RefreshGitHubInstallation());

            SetUser(Uid("10"));
            _userRepoMock.Setup(r => r.GetExternalAccessTokenAsync(10, "github")).ReturnsAsync((string?)null);
            var notFound1 = await _controller.RefreshGitHubInstallation();
            Assert.IsType<NotFoundObjectResult>(notFound1);

            _userRepoMock.Setup(r => r.GetExternalAccessTokenAsync(10, "github")).ReturnsAsync("encrypted_token");
            _encryptionServiceMock.Setup(e => e.Decrypt("encrypted_token")).Returns("decrypted_token");
            _appClientMock.Setup(c => c.GetUserInstallationIdAsync("decrypted_token")).ReturnsAsync((long?)null);
            var notFound2 = await _controller.RefreshGitHubInstallation();
            Assert.IsType<NotFoundObjectResult>(notFound2);

            _appClientMock.Setup(c => c.GetUserInstallationIdAsync("decrypted_token")).ReturnsAsync(999L);
            var okResult = await _controller.RefreshGitHubInstallation();
            Assert.IsType<OkObjectResult>(okResult);
            _userRepoMock.Verify(r => r.SetGitHubInstallationAsync(10, 999L), Times.Once);
        }

        [Fact]
        public async Task ExternalLogin_GitHub_WhenServiceNull_Returns503()
        {
            var controller = new AuthController(
                _authServiceMock.Object, _userRepoMock.Object, _encryptionServiceMock.Object, _appClientMock.Object,
                Options.Create(new GitHubAppOptions()), null, null);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = await controller.ExternalLogin("github");
            Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode);
        }

        [Fact]
        public async Task ExternalLogin_GitHub_WhenStartNull_Returns503()
        {
            _gitHubAppAuthServiceMock.Setup(s => s.StartAuthFlowAsync()).ReturnsAsync((Harbor.Authentication.DTOs.GitHubAppAuthStartResponse?)null);
            var result = await _controller.ExternalLogin("github");
            Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode);
        }

        [Fact]
        public async Task ExternalLogin_UnsupportedProvider_Returns404()
        {
            var result = await _controller.ExternalLogin("unsupported_provider");
            Assert.IsType<NotFoundObjectResult>(result);
        }

        [Fact]
        public async Task ExternalLogin_Google_Unconfigured_Returns503()
        {
            var origId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
            var origSec = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
            try
            {
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_ID", null);
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_SECRET", null);
                var result = await _controller.ExternalLogin("google");
                Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode);
            }
            finally
            {
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_ID", origId);
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_SECRET", origSec);
            }
        }

        [Fact]
        public async Task ExternalLogin_Google_Configured_ReturnsChallenge()
        {
            var origId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
            var origSec = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
            try
            {
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_ID", "test-id");
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_SECRET", "test-secret");
                var result = await _controller.ExternalLogin("google");
                Assert.IsType<ChallengeResult>(result);
            }
            finally
            {
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_ID", origId);
                Environment.SetEnvironmentVariable("GOOGLE_CLIENT_SECRET", origSec);
            }
        }

        [Fact]
        public void StartLinkedExternalLogin_AllBranches()
        {
            var ghResult = _controller.StartLinkedExternalLogin("github");
            Assert.IsType<RedirectResult>(ghResult);

            var unkResult = _controller.StartLinkedExternalLogin("unknown_xyz");
            Assert.IsType<NotFoundObjectResult>(unkResult);

            var googleResult = _controller.StartLinkedExternalLogin("google");
            Assert.IsType<ChallengeResult>(googleResult);
        }

        [Fact]
        public async Task GitHubAppCallback_ServiceNull_Returns503()
        {
            var controller = new AuthController(
                _authServiceMock.Object, _userRepoMock.Object, _encryptionServiceMock.Object, _appClientMock.Object,
                Options.Create(new GitHubAppOptions()), null, null);
            controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };

            var result = await controller.GitHubAppCallback();
            Assert.Equal(503, Assert.IsType<ObjectResult>(result).StatusCode);
        }

        [Fact]
        public async Task GitHubAppCallback_WithErrorParam_RedirectsWithError()
        {
            var result = await _controller.GitHubAppCallback(error: "access_denied");
            var redirect = Assert.IsType<RedirectResult>(result);
            Assert.Contains("error=access_denied", redirect.Url);
        }

        [Fact]
        public async Task LinkExternalLogin_AllBranches()
        {
            SetUser();
            Assert.IsType<UnauthorizedResult>(await _controller.LinkExternalLogin("github"));

            SetUser(Uid("10"));
            var nullServiceController = new AuthController(
                _authServiceMock.Object, _userRepoMock.Object, _encryptionServiceMock.Object, _appClientMock.Object,
                Options.Create(new GitHubAppOptions()), null, null);
            nullServiceController.ControllerContext = _controller.ControllerContext;
            Assert.Equal(503, Assert.IsType<ObjectResult>(await nullServiceController.LinkExternalLogin("github")).StatusCode);

            _gitHubAppAuthServiceMock.Setup(s => s.StartAuthFlowAsync()).ReturnsAsync((Harbor.Authentication.DTOs.GitHubAppAuthStartResponse?)null);
            Assert.Equal(503, Assert.IsType<ObjectResult>(await _controller.LinkExternalLogin("github")).StatusCode);

            Assert.IsType<NotFoundObjectResult>(await _controller.LinkExternalLogin("unknown_abc"));
        }
    }
}
