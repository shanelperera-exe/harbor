using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Harbor.Caching;

namespace Harbor.Project.Services
{
    public class ServiceService : IServiceService
    {
        private readonly IServiceRepository _serviceRepository;
        private readonly IProjectRepository _projectRepository;
        private readonly ICacheService _cache;

        public ServiceService(IServiceRepository serviceRepository, IProjectRepository projectRepository, ICacheService cache)
        {
            _serviceRepository = serviceRepository;
            _projectRepository = projectRepository;
            _cache = cache;
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
                WorkflowFile = string.IsNullOrWhiteSpace(request.WorkflowFile) ? "deploy.yml" : request.WorkflowFile.Trim(),
                DeploymentUrl = request.DeploymentUrls != null ? System.Text.Json.JsonSerializer.Serialize(request.DeploymentUrls) : request.DeploymentUrl?.Trim(),
                Provider = request.Provider?.Trim(),
                IsPrivate = request.IsPrivate
            };

            var id = await _serviceRepository.CreateAsync(serviceEntity);
            var service = await _serviceRepository.GetByIdAsync(id);
            
            await _cache.RemoveAsync(CacheKeys.ServicesByProject(project.Id));

            return (true, null, ToResponse(service!));
        }

        public async Task<(bool Success, string? Error, List<ServiceResponse>? Data)> GetByProjectIdAsync(string projectId, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            if (project == null) return (false, "Project not found.", null);
            if (!isAdmin && project.OwnerId != userId) return (false, "You do not have permission to view this project's services.", null);

            var services = await _cache.GetOrSetAsync(
                CacheKeys.ServicesByProject(project.Id),
                () => _serviceRepository.GetByProjectIdAsync(project.Id),
                CacheTtl.ServiceList
            );
            return (true, null, (services ?? new List<ServiceEntity>()).Select(ToResponse).ToList());
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

            await _cache.RemoveAsync(CacheKeys.ServicesByProject(project.Id));

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

            if (request.DeploymentUrls != null)
            {
                service.DeploymentUrl = System.Text.Json.JsonSerializer.Serialize(request.DeploymentUrls);
            }
            else if (request.DeploymentUrl != null)
            {
                service.DeploymentUrl = string.IsNullOrWhiteSpace(request.DeploymentUrl) ? null : request.DeploymentUrl.Trim();
            }

            if (request.Provider != null)
            {
                service.Provider = string.IsNullOrWhiteSpace(request.Provider) ? null : request.Provider.Trim();
            }

            var updated = await _serviceRepository.UpdateAsync(service);
            if (!updated) return (false, "Failed to update service.", null);

            await _cache.RemoveAsync(CacheKeys.ServicesByProject(project.Id));

            var updatedService = await _serviceRepository.GetByIdAsync(service.Id);
            return (true, null, ToResponse(updatedService!));
        }

        private static ServiceResponse ToResponse(ServiceEntity s)
        {
            var response = new ServiceResponse
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
                DeploymentUrl = s.DeploymentUrl,
                Provider = s.Provider,
                IsPrivate = s.IsPrivate,
                CreatedAt = s.CreatedAt,
                DeploymentUrls = new System.Collections.Generic.List<ServiceDeploymentUrl>()
            };

            if (!string.IsNullOrEmpty(s.DeploymentUrl))
            {
                try
                {
                    if (s.DeploymentUrl.Trim().StartsWith("["))
                    {
                        var parsedUrls = System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<ServiceDeploymentUrl>>(s.DeploymentUrl);
                        if (parsedUrls != null)
                        {
                            response.DeploymentUrls = parsedUrls;
                            // Set primary DeploymentUrl to the first one for backward compatibility
                            response.DeploymentUrl = parsedUrls.FirstOrDefault()?.Url;
                        }
                    }
                    else
                    {
                        response.DeploymentUrls.Add(new ServiceDeploymentUrl { Environment = "Production", Url = s.DeploymentUrl });
                    }
                }
                catch
                {
                    // Fallback if parsing fails
                    response.DeploymentUrls.Add(new ServiceDeploymentUrl { Environment = "Production", Url = s.DeploymentUrl });
                }
            }

            return response;
        }
    }
}
