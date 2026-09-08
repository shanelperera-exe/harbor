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

        [HttpPost]
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

        [HttpGet]
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