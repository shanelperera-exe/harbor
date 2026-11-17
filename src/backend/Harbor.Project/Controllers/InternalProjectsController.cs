using Harbor.Project.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Project.Controllers;

[ApiController]
[Route("api/internal/projects")]
public sealed class InternalProjectsController(IProjectRepository projectRepository) : ControllerBase
{
    [HttpGet("{projectId}/access")]
    public async Task<IActionResult> GetProjectAccess(string projectId)
    {
        var project = await projectRepository.GetByIdOrPublicIdAsync(projectId);
        if (project is null)
        {
            return Ok(new { exists = false, id = 0, ownerId = 0, isArchived = false });
        }

        return Ok(new
        {
            exists = true,
            id = project.Id,
            ownerId = project.OwnerId,
            isArchived = project.IsArchived
        });
    }
}
