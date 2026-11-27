using Harbor.Environment.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Environment.Controllers;

/// <summary>
/// Internal service-to-service endpoints for other Harbor microservices (e.g., Harbor.Deployment)
/// to validate environments without querying Harbor.Environment's isolated database directly.
/// </summary>
[ApiController]
[Route("api/internal/projects/{projectId:int}/environments")]
public class InternalEnvironmentsController(IEnvironmentRepository environmentRepository) : ControllerBase
{
    [HttpGet("{environmentName}")]
    public async Task<IActionResult> GetByName(int projectId, string environmentName)
    {
        if (string.IsNullOrWhiteSpace(environmentName))
            return BadRequest(new { error = "Environment name is required." });

        var environments = await environmentRepository.GetByProjectIdAsync(projectId);
        var match = environments.FirstOrDefault(e =>
            string.Equals(e.Name, environmentName.Trim(), StringComparison.OrdinalIgnoreCase));

        if (match is null)
            return NotFound(new { error = "Environment not found." });

        return Ok(new
        {
            data = new
            {
                match.Id,
                match.ProjectId,
                match.Name,
                match.Type,
                match.IsActive,
                match.DeploymentUrl
            }
        });
    }
}
