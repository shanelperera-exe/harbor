using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;

namespace Harbor.Project.Services
{
    public class ProjectService : IProjectService
    {
        private readonly IProjectRepository _projectRepository;

        public ProjectService(IProjectRepository projectRepository)
        {
            _projectRepository = projectRepository;
        }

        public async Task<(bool Success, string? Error, ProjectResponse? Data)> CreateAsync(CreateProjectRequest request, int ownerId)
        {
            // --- Scenario 3: Invalid project data ---
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return (false, "Project name is required.", null);
            }

            if (request.Name.Trim().Length < 3 || request.Name.Trim().Length > 100)
            {
                return (false, "Project name must be between 3 and 100 characters.", null);
            }

            if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > 500)
            {
                return (false, "Description cannot exceed 500 characters.", null);
            }

            if (await _projectRepository.NameExistsForOwnerAsync(request.Name.Trim(), ownerId))
            {
                return (false, "You already have a project with this name.", null);
            }

            var project = new ProjectEntity
            {
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                RepositoryUrl = request.RepositoryUrl?.Trim(),
                OwnerId = ownerId
            };

            var newId = await _projectRepository.CreateAsync(project);

            return (true, null, new ProjectResponse
            {
                Id = newId,
                Name = project.Name,
                Description = project.Description,
                RepositoryUrl = project.RepositoryUrl,
                OwnerId = project.OwnerId,
                CreatedAt = DateTime.UtcNow
            });
        }

        public async Task<List<ProjectResponse>> GetAccessibleProjectsAsync(int userId, bool isAdmin)
        {
            // For now, "accessible" = projects you own, or everything if you're an Admin.
            // If a team/sharing model gets added later, this is the only place that needs to change.
            var projects = isAdmin
                ? await _projectRepository.GetAllAsync()
                : await _projectRepository.GetByOwnerAsync(userId);

            return projects.Select(p => new ProjectResponse
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                RepositoryUrl = p.RepositoryUrl,
                OwnerId = p.OwnerId,
                CreatedAt = p.CreatedAt
            }).ToList();
        }
    }
}