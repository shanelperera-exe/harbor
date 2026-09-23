using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Services;
using Harbor.Authentication.Responses;
using Harbor.Authentication.Repositories;
using Harbor.GitHub.Services;
using Harbor.GitHub;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;
using Microsoft.Extensions.Options;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IExternalAuthService? _externalAuthService;
        private readonly IGitHubAppAuthService? _gitHubAppAuthService;
        private readonly IUserRepository _userRepository;
        private readonly IEncryptionService _encryptionService;
        private readonly IGitHubAppApiClient _appClient;
        private readonly GitHubAppOptions _appOptions;

        public AuthController(
            IAuthService authService, 
            IUserRepository userRepository,
            IEncryptionService encryptionService,
            IGitHubAppApiClient appClient,
            IOptions<GitHubAppOptions> appOptions,
            IExternalAuthService? externalAuthService = null, 
            IGitHubAppAuthService? gitHubAppAuthService = null)
        {
            _authService = authService;
            _externalAuthService = externalAuthService;
            _gitHubAppAuthService = gitHubAppAuthService;
            _userRepository = userRepository;
            _encryptionService = encryptionService;
            _appClient = appClient;
            _appOptions = appOptions.Value;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            var (success, error, data) = await _authService.RegisterAsync(request);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return StatusCode(201, new ApiResponse<RegisterResponse> { Data = data });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var (success, error, data) = await _authService.LoginAsync(request);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status401Unauthorized, title: "Unauthorized");
            }

            return Ok(new ApiResponse<LoginResponse> { Data = data });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var (success, error) = await _authService.ForgotPasswordAsync(request);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new { Message = "If an account exists, a password reset link has been sent." });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var (success, error) = await _authService.ResetPasswordAsync(request);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new { Message = "Password has been successfully reset." });
        }

        [Authorize]
        [HttpPut("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error) = await _authService.ChangePasswordAsync(userId, request);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new { message = "Password changed successfully." });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetProfile()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error, data) = await _authService.GetProfileAsync(userId);
            if (!success)
            {
                return NotFound(new { message = error });
            }

            return Ok(new ApiResponse<ProfileResponse> { Data = data });
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileRequest request)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error, data) = await _authService.UpdateProfileAsync(userId, request);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<ProfileResponse> { Data = data });
        }

        [Authorize]
        [HttpPut("preferences")]
        public async Task<IActionResult> UpdatePreferences([FromBody] AccountPreferencesRequest request)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error, data) = await _authService.UpdatePreferencesAsync(userId, request);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<AccountPreferencesResponse> { Data = data });
        }

        [AllowAnonymous]
        [HttpGet("external/{provider}")]
        public async Task<IActionResult> ExternalLogin(string provider)
        {
            if (provider.Equals("github", StringComparison.OrdinalIgnoreCase))
            {
                if (_gitHubAppAuthService == null)
                {
                    return Problem(detail: "GitHub login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");
                }

                var startResponse = await _gitHubAppAuthService.StartAuthFlowAsync();
                if (startResponse == null)
                {
                    return Problem(detail: "GitHub login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");
                }

                var linkIdentity = new ClaimsIdentity("ExternalLink");
                linkIdentity.AddClaim(new Claim("github_state", startResponse.State));
                linkIdentity.AddClaim(new Claim("github_code_verifier", startResponse.CodeVerifier));
                await HttpContext.SignInAsync("ExternalLink", new ClaimsPrincipal(linkIdentity), new AuthenticationProperties { IsPersistent = false });

                return Redirect(startResponse.RedirectUrl);
            }

            var scheme = provider.ToLowerInvariant() switch
            {
                "google" => "Google",
                _ => null
            };
            if (scheme == null)
            {
                return NotFound(new { message = "Unsupported external login provider." });
            }

            var configured = !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")) && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET"));
            if (!configured)
            {
                return Problem(detail: $"{scheme} login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");
            }

            return Challenge(new AuthenticationProperties { RedirectUri = $"/api/auth/external/{provider.ToLowerInvariant()}/complete" }, scheme);
        }

        [AllowAnonymous]
        [HttpGet("external/{provider}/complete")]
        public async Task<IActionResult> ExternalLoginComplete(string provider)
        {
            if (provider.Equals("github", StringComparison.OrdinalIgnoreCase))
            {
                return await GitHubAppCallback();
            }

            if (_externalAuthService == null)
            {
                return Problem(detail: "External login is unavailable.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");
            }

            var linkResult = await HttpContext.AuthenticateAsync("ExternalLink");
            var result = await HttpContext.AuthenticateAsync("External");
            if (!result.Succeeded || result.Principal == null)
            {
                return RedirectToFrontend("error=External%20login%20failed");
            }

            var accessToken = result.Properties?.GetTokenValue("access_token");

            await HttpContext.SignOutAsync("External");
            if (linkResult.Succeeded && linkResult.Principal != null && int.TryParse(linkResult.Principal.FindFirstValue("userId"), out var linkedUserId))
            {
                await HttpContext.SignOutAsync("ExternalLink");
                var (linked, linkError) = await _externalAuthService.LinkAsync(linkedUserId, result.Principal, provider.ToLowerInvariant(), accessToken);
                return linked
                    ? RedirectToFrontend("linked=true")
                    : RedirectToFrontend($"error={Uri.EscapeDataString(linkError ?? "Unable to link provider.")}");
            }

            var (success, error, data) = await _externalAuthService.LoginOrRegisterAsync(result.Principal, provider.ToLowerInvariant(), accessToken);
            if (!success || data == null)
            {
                return RedirectToFrontend($"error={Uri.EscapeDataString(error ?? "External login failed.")}");
            }

            var query = $"token={Uri.EscapeDataString(data.Token)}&username={Uri.EscapeDataString(data.Username)}&email={Uri.EscapeDataString(data.Email)}&role={Uri.EscapeDataString(data.Role)}&avatarSvg={Uri.EscapeDataString(data.AvatarSvg ?? string.Empty)}";
            return RedirectToFrontend(query);
        }

        [AllowAnonymous]
        [HttpGet("external/github/callback")]
        public async Task<IActionResult> GitHubAppCallback(string? code = null, string? state = null, string? error = null)
        {
            if (_gitHubAppAuthService == null)
                return Problem(detail: "GitHub login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");

            if (!string.IsNullOrEmpty(error))
                return RedirectToFrontend($"error={Uri.EscapeDataString(error)}");

            var linkResult = await HttpContext.AuthenticateAsync("ExternalLink");
            if (!linkResult.Succeeded || linkResult.Principal == null)
                return RedirectToFrontend("error=State%20validation%20failed");

            var storedState = linkResult.Principal.FindFirstValue("github_state");
            var codeVerifier = linkResult.Principal.FindFirstValue("github_code_verifier");

            if (storedState != state)
            {
                await HttpContext.SignOutAsync("ExternalLink");
                return RedirectToFrontend("error=State%20validation%20failed");
            }

            var isLink = linkResult.Principal.FindFirstValue("is_link") == "true";
            var linkUserIdStr = linkResult.Principal.FindFirstValue("userId");

            await HttpContext.SignOutAsync("ExternalLink");

            if (isLink && int.TryParse(linkUserIdStr, out var linkUserId))
            {
                var (linked, linkError) = await _gitHubAppAuthService.LinkAccountAsync(linkUserId, code ?? string.Empty, state ?? string.Empty, codeVerifier ?? string.Empty);
                return linked
                    ? RedirectToFrontend("linked=true")
                    : RedirectToFrontend($"error={Uri.EscapeDataString(linkError ?? "Unable to link provider.")}");
            }

            var (success, callbackError, data) = await _gitHubAppAuthService.CompleteAuthFlowAsync(code ?? string.Empty, state ?? string.Empty, codeVerifier ?? string.Empty);
            if (!success || data == null)
                return RedirectToFrontend($"error={Uri.EscapeDataString(callbackError ?? "External login failed.")}");

            var query = $"token={Uri.EscapeDataString(data.Token)}&username={Uri.EscapeDataString(data.Username)}&email={Uri.EscapeDataString(data.Email)}&role={Uri.EscapeDataString(data.Role)}&avatarSvg={Uri.EscapeDataString(data.AvatarSvg ?? string.Empty)}";
            return RedirectToFrontend(query);
        }

        [Authorize]
        [HttpPost("external/{provider}/link")]
        public async Task<IActionResult> LinkExternalLogin(string provider)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            if (provider.Equals("github", StringComparison.OrdinalIgnoreCase))
            {
                if (_gitHubAppAuthService == null)
                    return Problem(detail: "GitHub login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");

                var linkIdentity = new ClaimsIdentity("ExternalLink");
                linkIdentity.AddClaim(new Claim("userId", userId.ToString()));

                var startResponse = await _gitHubAppAuthService.StartAuthFlowAsync();
                if (startResponse == null)
                    return Problem(detail: "GitHub login is not configured.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");

                linkIdentity.AddClaim(new Claim("github_state", startResponse.State));
                linkIdentity.AddClaim(new Claim("github_code_verifier", startResponse.CodeVerifier));
                linkIdentity.AddClaim(new Claim("is_link", "true"));

                await HttpContext.SignInAsync("ExternalLink", new ClaimsPrincipal(linkIdentity), new AuthenticationProperties { IsPersistent = false });
                return Ok(new { url = startResponse.RedirectUrl });
            }

            var scheme = provider.ToLowerInvariant() switch
            {
                "google" => "Google",
                _ => null
            };
            if (scheme == null) return NotFound(new { message = "Unsupported external login provider." });

            var linkIdentity2 = new ClaimsIdentity("ExternalLink");
            linkIdentity2.AddClaim(new Claim("userId", userId.ToString()));
            await HttpContext.SignInAsync("ExternalLink", new ClaimsPrincipal(linkIdentity2), new AuthenticationProperties { IsPersistent = false });
            return Ok(new { url = $"/api/auth/external/{provider.ToLowerInvariant()}/link/start" });
        }

        [Authorize]
        [HttpDelete("external/{provider}")]
        public async Task<IActionResult> UnlinkExternalLogin(string provider)
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error, data) = await _authService.UnlinkExternalLoginAsync(userId, provider);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<ProfileResponse> { Data = data });
        }

        [Authorize]
        [HttpDelete("me")]
        public async Task<IActionResult> DeleteAccount()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            var (success, error) = await _authService.DeleteAccountAsync(userId);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new MessageResponse { Message = "Account deleted successfully." });
        }

        [AllowAnonymous]
        [HttpGet("external/{provider}/link/start")]
        public IActionResult StartLinkedExternalLogin(string provider)
        {
            if (provider.Equals("github", StringComparison.OrdinalIgnoreCase))
            {
                return RedirectToFrontend("error=GitHub%20link%20must%20be%20started%20via%20POST");
            }

            var scheme = provider.ToLowerInvariant() switch
            {
                "google" => "Google",
                _ => null
            };
            if (scheme == null) return NotFound(new { message = "Unsupported external login provider." });
            return Challenge(new AuthenticationProperties { RedirectUri = $"/api/auth/external/{provider.ToLowerInvariant()}/complete" }, scheme);
        }

        [Authorize]
        [HttpPost("github/refresh-installation")]
        public async Task<IActionResult> RefreshGitHubInstallation()
        {
            if (!TryGetUserId(out var userId)) return Unauthorized();

            // Get user's encrypted GitHub token
            var accessToken = await _userRepository.GetExternalAccessTokenAsync(userId, "github");
            if (string.IsNullOrWhiteSpace(accessToken))
                return NotFound(new { message = "GitHub account not connected." });

            var decrypted = _encryptionService.Decrypt(accessToken);

            // Get user's installation ID from GitHub
            var installationId = await _appClient.GetUserInstallationIdAsync(decrypted);
            if (!installationId.HasValue)
                return NotFound(new { message = "No GitHub App installations found for this user. Please install the Harbor GitHub App on your account or organization." });

            await _userRepository.SetGitHubInstallationAsync(userId, installationId.Value);

            return Ok(new { InstallationId = installationId.Value, Message = "GitHub installation refreshed successfully." });
        }

        private static IActionResult RedirectToFrontend(string query)
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
            return new RedirectResult($"{frontendUrl.TrimEnd('/')}/oauth/callback?{query}");
        }

        private bool TryGetUserId(out int userId)
        {
            return int.TryParse(User.FindFirstValue("userId"), out userId);
        }
    }
}
