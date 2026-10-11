using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Responses;
using Microsoft.AspNetCore.Authorization;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/auth/admin/users")]
    public class AdminUsersController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly ILogger<AdminUsersController> _logger;

        public AdminUsersController(IUserRepository userRepository, ILogger<AdminUsersController> logger)
        {
            _userRepository = userRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllUsers()
        {
            try
            {
                var users = await _userRepository.GetAllUsersAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve admin users");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to retrieve users" });
            }
        }

        [HttpPut("{userId}/role")]
        public async Task<IActionResult> UpdateRole(int userId, [FromBody] UpdateRoleRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Role))
            {
                return BadRequest(new { error = "Role is required" });
            }

            var success = await _userRepository.UpdateUserRoleAsync(userId, request.Role.Trim());
            if (!success)
            {
                return NotFound(new { error = "User not found or update failed" });
            }

            return Ok(new { success = true, role = request.Role.Trim() });
        }

        [HttpPut("{userId}/status")]
        public async Task<IActionResult> UpdateStatus(int userId, [FromBody] UpdateStatusRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Status))
            {
                return BadRequest(new { error = "Status is required" });
            }

            var success = await _userRepository.UpdateUserStatusAsync(userId, request.Status.Trim().ToLowerInvariant());
            if (!success)
            {
                return NotFound(new { error = "User not found or update failed" });
            }

            return Ok(new { success = true, status = request.Status.Trim().ToLowerInvariant() });
        }
    }
}
