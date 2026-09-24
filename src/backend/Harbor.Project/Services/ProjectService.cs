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
                PublicId = Harbor.Common.Utilities.IdGenerator.ProjectId(),
                Name = request.Name.Trim(),
                Description = request.Description?.Trim(),
                OwnerId = ownerId
            };

            var newId = await _projectRepository.CreateAsync(project);
            project.Id = newId;

            return (true, null, ToResponse(project));
        }

        public async Task<List<ProjectResponse>> GetAccessibleProjectsAsync(int userId, bool isAdmin)
        {
            var projects = isAdmin
                ? await _projectRepository.GetAllAsync()
                : await _projectRepository.GetByOwnerAsync(userId);

            return projects.Select(ToResponse).ToList();
        }

        public async Task<ProjectResponse?> GetByIdAsync(string projectId)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);
            return project == null ? null : ToResponse(project);
        }

        public async Task<(bool Success, string? Error, bool Forbidden, ProjectResponse? Data)> UpdateAsync(
            string projectId, UpdateProjectRequest request, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);

            if (project is null)
            {
                return (false, "Project not found.", false, null);
            }

            if (!isAdmin && project.OwnerId != userId)
            {
                return (false, "You do not have permission to update this project.", true, null);
            }

            if (project.IsArchived)
            {
                return (false, "Archived projects cannot be updated.", false, null);
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return (false, "Project name is required.", false, null);
            }

            if (request.Name.Trim().Length < 3 || request.Name.Trim().Length > 100)
            {
                return (false, "Project name must be between 3 and 100 characters.", false, null);
            }

            if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > 500)
            {
                return (false, "Description cannot exceed 500 characters.", false, null);
            }

            var trimmedName = request.Name.Trim();
            if (!string.Equals(trimmedName, project.Name, StringComparison.OrdinalIgnoreCase)
                && await _projectRepository.NameExistsForOwnerAsync(trimmedName, project.OwnerId))
            {
                return (false, "You already have a project with this name.", false, null);
            }

            project.Name = trimmedName;
            project.Description = request.Description?.Trim();

            var updated = await _projectRepository.UpdateAsync(project);
            if (!updated)
            {
                return (false, "Project could not be updated. It may have been archived.", false, null);
            }

            var refreshed = await _projectRepository.GetByIdAsync(project.Id);
            return (true, null, false, ToResponse(refreshed!));
        }

        public async Task<(bool Success, string? Error, bool Forbidden)> ArchiveAsync(string projectId, int userId, bool isAdmin)
        {
            var project = await _projectRepository.GetByIdOrPublicIdAsync(projectId);

            if (project is null)
            {
                return (false, "Project not found.", false);
            }

            if (!isAdmin && project.OwnerId != userId)
            {
                return (false, "You do not have permission to archive this project.", true);
            }

            if (project.IsArchived)
            {
                return (false, "Project is already archived.", false);
            }

            var archived = await _projectRepository.ArchiveAsync(project.Id, DateTime.UtcNow);
            if (!archived)
            {
                return (false, "Project could not be archived.", false);
            }

            return (true, null, false);
        }

        private static ProjectResponse ToResponse(ProjectEntity p) => new ProjectResponse
        {
            Id = p.Id,
            PublicId = string.IsNullOrEmpty(p.PublicId) ? p.Id.ToString() : p.PublicId,
            Name = p.Name,
            Description = p.Description,
            OwnerId = p.OwnerId,
            CreatedAt = p.CreatedAt,
            IsArchived = p.IsArchived,
            UpdatedAt = p.UpdatedAt
        };
    }
}