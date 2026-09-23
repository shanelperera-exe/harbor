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

        public async Task<(bool Success, string? Error, ServiceResponse? Data)> CreateAsync(string projectId, CreateServiceRequest request, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (project.IsArchived) return (false, "Cannot add services to an archived project.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to add services to this project.", null);

            if (string.IsNullOrWhiteSpace(request.Name)) return (false, "Service name is required.", null);
            if (string.IsNullOrWhiteSpace(request.Type)) return (false, "Service type is required.", null);

            if (!string.IsNullOrWhiteSpace(request.RepositoryUrl) &&
                string.IsNullOrWhiteSpace(request.RepositoryBranch) &&
                string.IsNullOrWhiteSpace(request.RepositoryCommit))
            {
                return (false, "A version reference (branch or commit) is required for deployed services.", null);
            }

            var serviceEntity = new ServiceEntity
            {
                PublicId = Harbor.Common.Utilities.IdGenerator.ServiceId(),
                ProjectId = project.Id,
                Name = request.Name.Trim(),
                Type = request.Type.Trim(),
                RepositoryUrl = request.RepositoryUrl?.Trim(),
                RepositoryName = request.RepositoryName?.Trim(),
                RepositoryBranch = request.RepositoryBranch?.Trim(),
                RepositoryCommit = request.RepositoryCommit?.Trim(),
                WorkflowFile = string.IsNullOrWhiteSpace(request.WorkflowFile) ? "deploy.yml" : request.WorkflowFile.Trim()
            };

            var id = await _serviceRepository.CreateAsync(serviceEntity);
            var service = await _serviceRepository.GetByIdAsync(id);

            return (true, null, ToResponse(service!));
        }

        public async Task<(bool Success, string? Error, List<ServiceResponse>? Data)> GetByProjectIdAsync(string projectId, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to view this project's services.", null);

            var services = await _serviceRepository.GetByProjectIdAsync(project.Id);
            return (true, null, services.Select(ToResponse).ToList());
        }

        public async Task<(bool Success, string? Error)> DeleteAsync(string serviceId, int userId, bool isAdmin)
        {
            var service = await _serviceRepository.GetByIdOrPublicIdAsync(serviceId);
            if (service == null) return (false, "Service not found.");

            var project = await _projectRepository.GetByIdAsync(service.ProjectId);
            if (project == null) return (false, "Project not found.");
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to delete this service.");

            var deleted = await _serviceRepository.DeleteAsync(service.Id);
            if (!deleted) return (false, "Failed to delete service.");

            return (true, null);
        }

        public async Task<(bool Success, string? Error, ServiceResponse? Data)> GetByIdAsync(string serviceId, int userId, bool isAdmin)
        {
            var service = await _serviceRepository.GetByIdOrPublicIdAsync(serviceId);
            if (service == null) return (false, "Service not found.", null);

            var project = await _projectRepository.GetByIdAsync(service.ProjectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to view this service.", null);

            return (true, null, ToResponse(service));
        }

        public async Task<(bool Success, string? Error, ServiceResponse? Data)> UpdateAsync(string serviceId, UpdateServiceRequest request, int userId, bool isAdmin)
        {
            var service = await _serviceRepository.GetByIdOrPublicIdAsync(serviceId);
            if (service == null) return (false, "Service not found.", null);

            var project = await _projectRepository.GetByIdAsync(service.ProjectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to update this service.", null);

            if (request.WorkflowFile != null)
            {
                service.WorkflowFile = string.IsNullOrWhiteSpace(request.WorkflowFile) ? "deploy.yml" : request.WorkflowFile.Trim();
            }

            if (request.BuildCommand != null)
            {
                service.BuildCommand = string.IsNullOrWhiteSpace(request.BuildCommand) ? null : request.BuildCommand.Trim();
            }

            if (request.StartCommand != null)
            {
                service.StartCommand = string.IsNullOrWhiteSpace(request.StartCommand) ? null : request.StartCommand.Trim();
            }

            var updated = await _serviceRepository.UpdateAsync(service);
            if (!updated) return (false, "Failed to update service.", null);

            var updatedService = await _serviceRepository.GetByIdAsync(service.Id);
            return (true, null, ToResponse(updatedService!));
        }

        private static ServiceResponse ToResponse(ServiceEntity s) => new()
        {
            Id = s.Id,
            PublicId = string.IsNullOrEmpty(s.PublicId) ? s.Id.ToString() : s.PublicId,
            ProjectId = s.ProjectId,
            Name = s.Name,
            Type = s.Type,
            RepositoryUrl = s.RepositoryUrl,
            RepositoryName = s.RepositoryName,
            RepositoryBranch = s.RepositoryBranch,
            RepositoryCommit = s.RepositoryCommit,
            WorkflowFile = s.WorkflowFile,
            BuildCommand = s.BuildCommand,
            StartCommand = s.StartCommand,
            CreatedAt = s.CreatedAt
        };
    }
}
