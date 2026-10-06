using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

[ApiController]
[Route("api/dashboard")]
[Route("api/deployments/dashboard")]
[Authorize]
public class DashboardController(IDeploymentService deploymentService) : ControllerBase
{
    /// <summary>
    /// Returns the centralized deployment dashboard containing accessible projects,
    /// recent deployment activity, and operational status counts.
    /// </summary>
    /// <remarks>
    /// Regular users receive only their own accessible projects and deployments.
    /// Admins receive aggregated project and deployment activity across all users.
    /// </remarks>
    /// <response code="200">The dashboard operational state and accessible data.</response>
    /// <response code="401">The user is not authenticated.</response>
    [HttpGet]
    [ProducesResponseType(typeof(DashboardSummaryResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DashboardSummaryResponse>> Get()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var summary = await deploymentService.GetDashboardAsync(userId.Value, isAdmin);
        return Ok(summary);
    }

    private int? GetUserId() => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
