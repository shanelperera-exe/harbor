using Harbor.Reporting.DTOs;
using Harbor.Reporting.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Reporting.Controllers;

/// <summary>
/// Deployment Reporting API — US-22: Dynamic Deployment Reports.
///
/// Provides a filterable, parameterized report of deployment activity.
/// All SQL executed by the underlying repository uses named parameters;
/// no user-supplied input is concatenated into query strings.
/// </summary>
[ApiController]
[Route("api/reports")]
[Route("api/reporting")]
[Authorize]
[Produces("application/json")]
public class DeploymentReportController(IReportService reportService) : ControllerBase
{
    /// <summary>
    /// Generates a deployment report based on the supplied filter parameters.
    /// </summary>
    /// <remarks>
    /// Filters are all optional — omitting a filter means "no restriction on that field".
    /// All filters are combined with AND logic.
    ///
    /// The response includes:
    /// - The applied filter values (for auditability)
    /// - Aggregate statistics: total, successful, failed, success rate, average duration
    /// - The individual deployment rows that matched
    ///
    /// When no records match the filters the statistics fields contain zeros and
    /// Items is an empty array (no misleading data is returned).
    /// </remarks>
    /// <param name="query">Optional filter parameters: projectId, environment, status, startDate, endDate.</param>
    /// <response code="200">Report generated successfully.</response>
    /// <response code="400">One or more query parameters are invalid.</response>
    /// <response code="401">The caller is not authenticated.</response>
    [HttpGet("deployments")]
    [ProducesResponseType(typeof(DeploymentReportResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DeploymentReportResponse>> GetDeploymentReport(
        [FromQuery] DeploymentReportQuery query)
    {
        // Basic date-range validation
        if (query.StartDate.HasValue && query.EndDate.HasValue && query.StartDate > query.EndDate)
            return BadRequest(new ProblemDetails
            {
                Title  = "Invalid date range",
                Detail = "StartDate must be on or before EndDate.",
                Status = StatusCodes.Status400BadRequest,
            });

        var userId  = GetUserId();
        if (userId is null) return Unauthorized();

        var isAdmin = User.IsInRole("Admin");
        var report  = await reportService.GetDeploymentReportAsync(userId.Value, isAdmin, query);
        return Ok(report);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private int? GetUserId() =>
        int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}
