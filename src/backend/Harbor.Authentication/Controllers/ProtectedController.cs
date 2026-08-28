using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProtectedController : ControllerBase
    {
        [HttpGet("ping")]
        [Authorize]
        public IActionResult Ping()
        {
            var username = User.Identity?.Name;
            return Ok(new { message = $"Hello {username}, you are authenticated." });
        }
    }
}
