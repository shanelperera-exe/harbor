using System.Threading.Tasks;
using Harbor.Project.DTOs;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Project.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/projects/{projectId}/integrations")]
    public class ProjectIntegrationsController : ControllerBase
    {
        private readonly IProjectIntegrationService _integrationService;

        public ProjectIntegrationsController(IProjectIntegrationService integrationService)
        {
            _integrationService = integrationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetIntegrations(string projectId)
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            var isAdmin = User.IsInRole("Admin");

            var (success, error, data) = await _integrationService.GetByProjectIdAsync(projectId, userId, isAdmin);

            if (!success) return BadRequest(new { error });
            return Ok(data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateIntegration(string projectId, [FromBody] CreateProjectIntegrationRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            var isAdmin = User.IsInRole("Admin");

            var (success, error, data) = await _integrationService.CreateAsync(projectId, request, userId, isAdmin);

            if (!success) return BadRequest(new { error });
            return CreatedAtAction(nameof(GetIntegrations), new { projectId }, data);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteIntegration(string projectId, int id)
        {
            var userId = int.Parse(User.FindFirst("userId")?.Value ?? "0");
            var isAdmin = User.IsInRole("Admin");

            var (success, error) = await _integrationService.DeleteAsync(id, userId, isAdmin);

            if (!success) return BadRequest(new { error });
            return NoContent();
        }
    }
}
