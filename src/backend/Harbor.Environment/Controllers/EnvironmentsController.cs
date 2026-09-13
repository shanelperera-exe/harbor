using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Responses;
using Harbor.Environment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Environment.Controllers;

/// <summary>Creates and lists deployment environments for a project.</summary>
[ApiController]
[Route("api/projects/{projectId:int}/environments")]
[Authorize]
public class EnvironmentsController(IEnvironmentService environmentService) : ControllerBase
{
    /// <summary>Creates a Development, Staging, or Production environment for a project.</summary>
    /// <response code="201">The environment was created.</response>
    /// <response code="400">The project is invalid/archived or the request fails validation.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not own the project and is not an administrator.</response>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<EnvironmentResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Create(int projectId, [FromBody] CreateEnvironmentRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var result = await environmentService.CreateAsync(projectId, request, userId.Value, User.IsInRole(Roles.Admin));
        if (!result.Success)
            return Problem(detail: result.Error, statusCode: result.Forbidden ? StatusCodes.Status403Forbidden : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        return StatusCode(StatusCodes.Status201Created, new ApiResponse<EnvironmentResponse> { Data = result.Data });
    }

    /// <summary>Lists all environments configured for a project the caller can access.</summary>
    /// <response code="200">The project's environments (possibly empty).</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not own the project and is not an administrator.</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EnvironmentResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetByProject(int projectId)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var result = await environmentService.GetByProjectAsync(projectId, userId.Value, User.IsInRole(Roles.Admin));
        if (!result.Success)
            return Problem(detail: result.Error, statusCode: result.Forbidden ? StatusCodes.Status403Forbidden : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        return Ok(new ApiResponse<List<EnvironmentResponse>> { Data = result.Data });
    }

    private int? GetUserId() => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
