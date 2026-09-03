using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.Models;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Responses;

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
            return Ok(new ApiResponse<MessageResponse> { Data = new MessageResponse { Message = $"Hello {username}, you are authenticated." } });
        }

        // Only Admins can reach this
        [HttpGet("admin-only")]
        [Authorize(Roles = Roles.Admin)]
        public IActionResult AdminOnly()
        {
            return Ok(new ApiResponse<MessageResponse> { Data = new MessageResponse { Message = "Welcome, Admin. You can manage the platform." } });
        }

        // Admins and Developers can reach this, Viewers cannot
        [HttpGet("developer-area")]
        [Authorize(Roles = $"{Roles.Admin},{Roles.Developer}")]
        public IActionResult DeveloperArea()
        {
            return Ok(new ApiResponse<MessageResponse> { Data = new MessageResponse { Message = "Welcome, Developer. You can trigger operations here." } });
        }
    }
}
