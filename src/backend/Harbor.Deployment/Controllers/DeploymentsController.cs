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

    private int? GetUserId() => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
