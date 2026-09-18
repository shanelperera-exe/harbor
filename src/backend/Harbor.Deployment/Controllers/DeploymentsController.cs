using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

[ApiController]
[Route("api/deployments")]
[Authorize]
public class DeploymentsController(IDeploymentService deploymentService) : ControllerBase
{
    /// <summary>Returns deployment history for the authenticated developer, newest first.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(DeploymentListResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<DeploymentListResponse>> GetHistory([FromQuery] DeploymentHistoryQuery query)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return Ok(await deploymentService.GetHistoryAsync(userId.Value, query));
    }

    /// <summary>Returns a deployment's details, including ordered execution logs and failure information when available.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DeploymentDetailsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DeploymentDetailsResponse>> GetDetails(int id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        var deployment = await deploymentService.GetDetailsAsync(id, userId.Value);
        return deployment is null ? NotFound() : Ok(deployment);
    }

    /// <summary>Creates a deployment request for a project and environment the authenticated user has access to.</summary>
    /// <param name="request">The project, environment, version, and optional commit SHA.</param>
    /// <response code="201">The deployment request was created.</response>
    /// <response code="400">The request fails validation or the project/environment is invalid.</response>
    /// <response code="401">The caller is not authenticated.</response>
    /// <response code="403">The caller does not have permission to deploy to this project.</response>
    [HttpPost]
    [ProducesResponseType(typeof(CreateDeploymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<CreateDeploymentResponse>> Create([FromBody] CreateDeploymentRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await deploymentService.CreateAsync(request, userId.Value, User.IsInRole("Admin"));

        if (!result.Success)
        {
            return Problem(detail: result.Error, statusCode: StatusCodes.Status400BadRequest, title: result.Error);
        }

        var response = new CreateDeploymentResponse
        {
            Id = result.DeploymentId!.Value,
            ServiceId = request.ServiceId,
            OwnerId = userId.Value,
            Environment = request.Environment,
            Version = request.Version,
            CommitSha = request.CommitSha,
            Status = "Pending",
            StartedAt = DateTime.UtcNow
        };

        return StatusCode(StatusCodes.Status201Created, response);
    }

    private int? GetUserId() => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
