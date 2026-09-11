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
        /// </remarks>
        /// <response code="200">The list of accessible projects (may be empty).</response>
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

        private int? GetUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}