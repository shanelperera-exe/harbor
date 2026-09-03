using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Services;
using Harbor.Authentication.Responses;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
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
    }
}
