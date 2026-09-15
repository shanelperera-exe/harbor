using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IProjectService
    {
        Task<(bool Success, string? Error, ProjectResponse? Data)> CreateAsync(CreateProjectRequest request, int ownerId);
        Task<List<ProjectResponse>> GetAccessibleProjectsAsync(int userId, bool isAdmin);

        Task<(bool Success, string? Error, bool Forbidden, ProjectResponse? Data)> UpdateAsync(
            int projectId, UpdateProjectRequest request, int userId, bool isAdmin);

        Task<(bool Success, string? Error, bool Forbidden)> ArchiveAsync(
            int projectId, int userId, bool isAdmin);
    }
}