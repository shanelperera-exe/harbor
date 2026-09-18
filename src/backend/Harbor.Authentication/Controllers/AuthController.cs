using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Services;
using Harbor.Authentication.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IExternalAuthService? _externalAuthService;

        public AuthController(IAuthService authService, IExternalAuthService? externalAuthService = null)
        {
            _authService = authService;
            _externalAuthService = externalAuthService;
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
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

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
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

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
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var (success, error, data) = await _authService.UpdateProfileAsync(userId, request);
            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<ProfileResponse> { Data = data });
        }

        [AllowAnonymous]
        [HttpGet("external/{provider}")]
        public IActionResult ExternalLogin(string provider)
        {
            var scheme = provider.ToLowerInvariant() switch
            {
                "google" => "Google",
                "github" => "GitHub",
                _ => null
            };
            if (scheme == null)
            {
                return NotFound(new { message = "Unsupported external login provider." });
            }

            var configured = scheme == "Google"
                ? !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID")) && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET"))
                : !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_CLIENT_ID")) && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_CLIENT_SECRET"));
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
            if (_externalAuthService == null)
            {
                return Problem(detail: "External login is unavailable.", statusCode: StatusCodes.Status503ServiceUnavailable, title: "External login unavailable");
            }

            var result = await HttpContext.AuthenticateAsync("External");
            if (!result.Succeeded || result.Principal == null)
            {
                return RedirectToFrontend("error=External%20login%20failed");
            }

            await HttpContext.SignOutAsync("External");
            var (success, error, data) = await _externalAuthService.LoginOrRegisterAsync(result.Principal);
            if (!success || data == null)
            {
                return RedirectToFrontend($"error={Uri.EscapeDataString(error ?? "External login failed.")}");
            }

            var query = $"token={Uri.EscapeDataString(data.Token)}&username={Uri.EscapeDataString(data.Username)}&email={Uri.EscapeDataString(data.Email)}&role={Uri.EscapeDataString(data.Role)}&avatarSvg={Uri.EscapeDataString(data.AvatarSvg ?? string.Empty)}";
            return RedirectToFrontend(query);
        }

        private static IActionResult RedirectToFrontend(string query)
        {
            var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
            return new RedirectResult($"{frontendUrl.TrimEnd('/')}/oauth/callback?{query}");
        }
    }
}
