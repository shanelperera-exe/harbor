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
        public async Task<IActionResult> Create(string projectId, [FromBody] CreateServiceRequest request)
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
        public async Task<IActionResult> GetByProjectId(string projectId)
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
        public async Task<IActionResult> Delete(string projectId, string id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error) = await _serviceService.DeleteAsync(id, userId.Value, isAdmin);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<object> { Data = null });
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetById(string projectId, string id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, data) = await _serviceService.GetByIdAsync(id, userId.Value, isAdmin);

            if (!success || data == null)
            {
                return NotFound(new { error = error ?? "Service not found." });
            }

            return Ok(new ApiResponse<ServiceResponse> { Data = data });
        }

        [HttpPatch("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string projectId, string id, [FromBody] UpdateServiceRequest request)
        {
            var ownerId = GetUserId();
            if (ownerId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, data) = await _serviceService.UpdateAsync(id, request, ownerId.Value, isAdmin);

            if (!success)
            {
                return Problem(detail: error, statusCode: error == "Service not found." ? StatusCodes.Status404NotFound : StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<ServiceResponse> { Data = data });
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}
