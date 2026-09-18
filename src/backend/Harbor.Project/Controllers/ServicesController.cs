using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Harbor.Project.DTOs;
using Harbor.Project.Services;
using Harbor.Project.Responses;
using Harbor.Project.Models;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId}/services")]
    [Authorize]
    public class ServicesController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public ServicesController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Create(int projectId, [FromBody] CreateServiceRequest request)
        {
            var ownerId = GetUserId();
            if (ownerId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, data) = await _serviceService.CreateAsync(projectId, request, ownerId.Value, isAdmin);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return StatusCode(201, new ApiResponse<ServiceResponse> { Data = data });
        }

        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<ServiceResponse>>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetByProjectId(int projectId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, data) = await _serviceService.GetByProjectIdAsync(projectId, userId.Value, isAdmin);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<List<ServiceResponse>> { Data = data });
        }

        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Delete(int projectId, int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            // Ideally we'd verify the service belongs to the projectId in the route too
            var (success, error) = await _serviceService.DeleteAsync(id, userId.Value, isAdmin);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<object> { Data = null });
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}
