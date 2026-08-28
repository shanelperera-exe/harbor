using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Services;

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
                return BadRequest(new { message = error });
            }

            return CreatedAtAction(nameof(Register), data);
        }
    }
}