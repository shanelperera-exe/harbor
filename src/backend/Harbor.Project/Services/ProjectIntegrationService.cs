using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Harbor.Common.Security;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;

namespace Harbor.Project.Services
{
    public class ProjectIntegrationService : IProjectIntegrationService
    {
        private readonly IProjectIntegrationRepository _integrationRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly IHarborSecretProtector _secretProtector;

        public ProjectIntegrationService(
            IProjectIntegrationRepository integrationRepository,
            IProjectRepository projectRepository,
            IHarborSecretProtector secretProtector)
        {
            _integrationRepository = integrationRepository;
            _projectRepository = projectRepository;
            _secretProtector = secretProtector;
        }

        public async Task<(bool Success, string? Error, ProjectIntegrationResponse? Data)> CreateAsync(string projectId, CreateProjectIntegrationRequest request, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to add integrations to this project.", null);

            var encryptedToken = _secretProtector.Protect(request.ProviderToken.Trim());

            var entity = new ProjectIntegrationEntity
            {
                ProjectId = project.Id,
                ProviderType = request.ProviderType.Trim(),
                Name = request.Name.Trim(),
                ProviderToken = encryptedToken
            };

            var id = await _integrationRepository.CreateAsync(entity);
            var created = await _integrationRepository.GetByIdAsync(id);

            return (true, null, ToResponse(created!));
        }

        public async Task<(bool Success, string? Error, List<ProjectIntegrationResponse>? Data)> GetByProjectIdAsync(string projectId, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to view this project's integrations.", null);

            var list = await _integrationRepository.GetByProjectIdAsync(project.Id);
            return (true, null, list.Select(ToResponse).ToList());
        }

        public async Task<(bool Success, string? Error)> DeleteAsync(int id, int userId, bool isAdmin)
        {
            var integration = await _integrationRepository.GetByIdAsync(id);
            if (integration == null) return (false, "Integration not found.");

            var project = await _projectRepository.GetByIdAsync(integration.ProjectId);
            if (project == null) return (false, "Project not found.");
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to delete this integration.");

            var deleted = await _integrationRepository.DeleteAsync(id);
            if (!deleted) return (false, "Failed to delete integration.");

            return (true, null);
        }

        private static ProjectIntegrationResponse ToResponse(ProjectIntegrationEntity entity)
        {
            return new ProjectIntegrationResponse
            {
                Id = entity.Id,
                ProjectId = entity.ProjectId,
                ProviderType = entity.ProviderType,
                Name = entity.Name,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
