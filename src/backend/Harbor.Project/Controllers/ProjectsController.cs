using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Harbor.Project.DTOs;
using Harbor.Project.Services;
using Harbor.Project.Responses;
using Harbor.Project.Models;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProjectsController : ControllerBase
    {
        private readonly IProjectService _projectService;

        public ProjectsController(IProjectService projectService)
        {
            _projectService = projectService;
        }

        /// <summary>
        /// Creates a new project owned by the authenticated user.
        /// </summary>
        /// <param name="request">The project name, optional description, and optional repository URL.</param>
        /// <response code="201">The project was created successfully.</response>
        /// <response code="400">The request failed validation (e.g. missing name, duplicate name).</response>
        /// <response code="401">The caller is not authenticated.</response>
        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<ProjectResponse>), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Create([FromBody] CreateProjectRequest request)
        {
            var ownerId = GetUserId();
            if (ownerId is null) return Unauthorized();

            var (success, error, data) = await _projectService.CreateAsync(request, ownerId.Value);

            if (!success)
            {
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return StatusCode(201, new ApiResponse<ProjectResponse> { Data = data });
        }

        /// <summary>
        /// Returns the projects the authenticated user is permitted to see.
        /// </summary>
        /// <remarks>
        /// Regular users receive only the projects they own. Users in the Admin role receive all projects.
        /// Archived projects are excluded from this list.
        /// </remarks>
        /// <response code="200">The list of accessible active projects (may be empty).</response>
        /// <response code="401">The caller is not authenticated.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<ProjectResponse>>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var projects = await _projectService.GetAccessibleProjectsAsync(userId.Value, isAdmin);

            return Ok(new ApiResponse<List<ProjectResponse>> { Data = projects });
        }

        /// <summary>
        /// Updates an existing project's name, description, and repository URL.
        /// </summary>
        /// <param name="id">The id of the project to update.</param>
        /// <param name="request">The updated project fields.</param>
        /// <response code="200">The project was updated successfully.</response>
        /// <response code="400">The request failed validation, the project was not found, or it is archived.</response>
        /// <response code="401">The caller is not authenticated.</response>
        /// <response code="403">The caller does not have permission to update this project.</response>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ProjectResponse>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectRequest request)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, forbidden, data) = await _projectService.UpdateAsync(id, request, userId.Value, isAdmin);

            if (!success)
            {
                if (forbidden)
                {
                    return Problem(detail: error, statusCode: StatusCodes.Status403Forbidden, title: "Forbidden");
                }
                return Problem(detail: error, statusCode: StatusCodes.Status400BadRequest, title: "Bad Request");
            }

            return Ok(new ApiResponse<ProjectResponse> { Data = data });
        }

        /// <summary>
        /// Archives a project, removing it from active project listings while preserving its history.
        /// </summary>
        /// <param name="id">The id of the project to archive.</param>
        /// <response code="200">The project was archived successfully.</response>
        /// <response code="400">The project was not found or is already archived.</response>
        /// <response code="401">The caller is not authenticated.</response>
        /// <response code="403">The caller does not have permission to archive this project.</response>
        [HttpPost("{id}/archive")]
        [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Archive(int id)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, error, forbidden) = await _projectService.ArchiveAsync(id, userId.Value, isAdmin);

            if (!success)
            {
                if (forbidden)
                {
                    return Problem(detail: error, statusCode: StatusCodes.Status403Forbidden, title: "Forbidden");
                }
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