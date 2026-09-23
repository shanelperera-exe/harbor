using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

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

    /// <summary>Returns CI run history for a service, newest first.</summary>
    [HttpGet("ci-runs")]
    [ProducesResponseType(typeof(CiRunListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CiRunListResponse>> GetCiRuns([FromQuery] CiRunQuery query)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();
        return Ok(await deploymentService.GetCiRunsAsync(userId.Value, query.ServiceId, query.Page, query.PageSize));
    }
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
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<CreateDeploymentResponse>> Create([FromBody] CreateDeploymentRequest request)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await deploymentService.CreateAsync(request, userId.Value, User.IsInRole("Admin"));

        if (!result.Success && result.Status == "CiGate")
        {
            // CI checks are failing — return 422 so frontend can show "Deploy anyway?" prompt
            return UnprocessableEntity(new CreateDeploymentResponse
            {
                ServiceId = request.ServiceId,
                Environment = request.Environment,
                Version = request.Version,
                Status = "CiGate",
                CiWarning = result.CiWarning
            });
        }

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
            Status = result.Status,
            StartedAt = DateTime.UtcNow,
            FailureReason = result.Error
        };

        if (result.Status == "Failed")
            return StatusCode(StatusCodes.Status502BadGateway, response);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    /// <summary>
    /// Re-deploys a previously succeeded deployment by creating a fresh deployment
    /// record with the same environment, version, branch, and commit SHA.
    /// Only deployments with status "Succeeded" owned by the caller are eligible.
    /// </summary>
    [HttpPost("{id:int}/redeploy")]
    [ProducesResponseType(typeof(CreateDeploymentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<CreateDeploymentResponse>> Redeploy(int id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var result = await deploymentService.RedeployAsync(id, userId.Value, User.IsInRole("Admin"));

        if (!result.Success)
            return NotFound(new ProblemDetails
            {
                Title = "Deployment not found",
                Detail = result.Error,
                Status = StatusCodes.Status404NotFound
            });

        // The redeploy reuses CreateAsync internally, so the response shape mirrors it.
        // We don't have ServiceId/Environment from the original request, but the
        // service layer resolves them from the source deployment.
        var response = new CreateDeploymentResponse
        {
            Id = result.DeploymentId!.Value,
            Status = result.Status,
            StartedAt = DateTime.UtcNow,
            FailureReason = result.Error
        };

        if (result.Status == "Failed")
            return StatusCode(StatusCodes.Status502BadGateway, response);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [AllowAnonymous]
    [HttpPost("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UpdateStatus(int id)
    {
        var secret = Environment.GetEnvironmentVariable("GITHUB_WEBHOOK_SECRET");
        if (string.IsNullOrWhiteSpace(secret)) return Unauthorized();
        var signature = Request.Headers["X-Harbor-Signature"].ToString();
        using var reader = new StreamReader(Request.Body);
        var payload = await reader.ReadToEndAsync();
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var expected = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(signature), Encoding.UTF8.GetBytes(expected)))
            return Unauthorized();
        var request = JsonSerializer.Deserialize<DeploymentStatusCallback>(payload);
        if (request is null) return BadRequest("A status payload is required.");
        if (!new[] { "Running", "Succeeded", "Failed" }.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
            return BadRequest("Status must be Running, Succeeded, or Failed.");
        return await deploymentService.UpdateStatusAsync(id, request.Status, request.FailureReason)
            ? NoContent()
            : NotFound();
    }

    private int? GetUserId() => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;
}

public sealed class DeploymentStatusCallback
{
    public string Status { get; init; } = string.Empty;
    public string? FailureReason { get; init; }
}
