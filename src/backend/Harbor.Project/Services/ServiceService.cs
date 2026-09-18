using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;

namespace Harbor.Project.Services
{
    public class ServiceService : IServiceService
    {
        private readonly IServiceRepository _serviceRepository;
        private readonly IProjectRepository _projectRepository;

        public ServiceService(IServiceRepository serviceRepository, IProjectRepository projectRepository)
        {
            _serviceRepository = serviceRepository;
            _projectRepository = projectRepository;
        }

        public async Task<(bool Success, string? Error, ServiceResponse? Data)> CreateAsync(int projectId, CreateServiceRequest request, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (project.IsArchived) return (false, "Cannot add services to an archived project.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to add services to this project.", null);

            if (string.IsNullOrWhiteSpace(request.Name)) return (false, "Service name is required.", null);
            if (string.IsNullOrWhiteSpace(request.Type)) return (false, "Service type is required.", null);

            var serviceEntity = new ServiceEntity
            {
                ProjectId = projectId,
                Name = request.Name.Trim(),
                Type = request.Type.Trim(),
                RepositoryUrl = request.RepositoryUrl?.Trim()
            };

            var id = await _serviceRepository.CreateAsync(serviceEntity);
            var service = await _serviceRepository.GetByIdAsync(id);

            return (true, null, ToResponse(service!));
        }

        public async Task<(bool Success, string? Error, List<ServiceResponse>? Data)> GetByProjectIdAsync(int projectId, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to view this project's services.", null);

            var services = await _serviceRepository.GetByProjectIdAsync(projectId);
            return (true, null, services.Select(ToResponse).ToList());
        }

        public async Task<(bool Success, string? Error)> DeleteAsync(int serviceId, int userId, bool isAdmin)
        {
            var service = await _serviceRepository.GetByIdAsync(serviceId);
            if (service == null) return (false, "Service not found.");

            var project = await _projectRepository.GetByIdAsync(service.ProjectId);
            if (project == null) return (false, "Project not found.");
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to delete this service.");

            var deleted = await _serviceRepository.DeleteAsync(serviceId);
            if (!deleted) return (false, "Failed to delete service.");

            return (true, null);
        }

        private static ServiceResponse ToResponse(ServiceEntity s) => new()
        {
            Id = s.Id,
            ProjectId = s.ProjectId,
            Name = s.Name,
            Type = s.Type,
            RepositoryUrl = s.RepositoryUrl,
            CreatedAt = s.CreatedAt
        };
    }
}
