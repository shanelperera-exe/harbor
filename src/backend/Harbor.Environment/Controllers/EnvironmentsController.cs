using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Responses;
using Harbor.Environment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Environment.Controllers;

/// <summary>Creates and manages deployment environments for a project.</summary>
[ApiController]
[Route("api/projects/{projectId}/environments")]
[Authorize]
public class EnvironmentsController(
    IEnvironmentService environmentService,
    IEnvironmentConfigurationService environmentConfigurationService) : ControllerBase
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
    public async Task<IActionResult> Create(
        string projectId,
        [FromBody] CreateEnvironmentRequest request)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentService.CreateAsync(
            projectId,
            request,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return StatusCode(
            StatusCodes.Status201Created,
            new ApiResponse<EnvironmentResponse>
            {
                Data = result.Data
            });
    }

    /// <summary>Lists all environments configured for a project the caller can access.</summary>
    /// <response code="200">The project's environments (possibly empty).</response>
    /// <response code="400">The project is invalid.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not own the project and is not an administrator.</response>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<EnvironmentResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetByProject(string projectId)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentService.GetByProjectAsync(
            projectId,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return Ok(new ApiResponse<List<EnvironmentResponse>>
        {
            Data = result.Data
        });
    }

    /// <summary>Updates an active environment. Environments with deployment history cannot be renamed.</summary>
    [HttpPut("{environmentId:int}")]
    [ProducesResponseType(typeof(ApiResponse<EnvironmentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Update(
        string projectId,
        int environmentId,
        [FromBody] UpdateEnvironmentRequest request)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentService.UpdateAsync(
            projectId,
            environmentId,
            request,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return Ok(new ApiResponse<EnvironmentResponse>
        {
            Data = result.Data
        });
    }

    /// <summary>Removes an unused environment or deactivates one with retained deployment history.</summary>
    [HttpDelete("{environmentId:int}")]
    [ProducesResponseType(typeof(ApiResponse<EnvironmentRemovalResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Remove(
        string projectId,
        int environmentId)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentService.RemoveAsync(
            projectId,
            environmentId,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return Ok(new ApiResponse<EnvironmentRemovalResponse>
        {
            Data = result.Data
        });
    }

    /// <summary>
    /// Gets the deployment information, configuration, and secure-value keys for an environment.
    /// Secure values are never returned — only whether each key is set.
    /// </summary>
    /// <response code="200">The environment's configuration.</response>
    /// <response code="400">The environment does not exist or is inactive.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not own the project and is not an administrator.</response>
    [HttpGet("{environmentId:int}/configuration")]
    [ProducesResponseType(
        typeof(ApiResponse<EnvironmentConfigurationResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetConfiguration(
        string projectId,
        int environmentId)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentConfigurationService.GetAsync(
            projectId,
            environmentId,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return Ok(new ApiResponse<EnvironmentConfigurationResponse>
        {
            Data = result.Data
        });
    }

    /// <summary>
    /// Saves the deployment information, configuration, and secure values for an environment,
    /// so Harbor can use the environment during deployment.
    /// </summary>
    /// <response code="200">The configuration was saved.</response>
    /// <response code="400">The request is incomplete or fails validation.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not own the project and is not an administrator.</response>
    [HttpPut("{environmentId:int}/configuration")]
    [ProducesResponseType(
        typeof(ApiResponse<EnvironmentConfigurationResponse>),
        StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Configure(
        string projectId,
        int environmentId,
        [FromBody] ConfigureEnvironmentRequest request)
    {
        var userId = GetUserId();

        if (userId is null)
            return Unauthorized();

        var result = await environmentConfigurationService.ConfigureAsync(
            projectId,
            environmentId,
            request,
            userId.Value,
            User.IsInRole(Roles.Admin));

        if (!result.Success)
        {
            return Problem(
                detail: result.Error,
                statusCode: result.Forbidden
                    ? StatusCodes.Status403Forbidden
                    : StatusCodes.Status400BadRequest,
                title: result.Forbidden ? "Forbidden" : "Bad Request");
        }

        return Ok(new ApiResponse<EnvironmentConfigurationResponse>
        {
            Data = result.Data
        });
    }

    private int? GetUserId() =>
        int.TryParse(User.FindFirst("userId")?.Value, out var id)
            ? id
            : null;
}