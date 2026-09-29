using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IProjectService
    {
        Task<(bool Success, string? Error, ProjectResponse? Data)> CreateAsync(CreateProjectRequest request, int ownerId);
        Task<List<ProjectResponse>> GetAccessibleProjectsAsync(int userId, bool isAdmin);
        Task<ProjectResponse?> GetByIdAsync(string projectId);

        Task<(bool Success, string? Error, bool Forbidden, ProjectResponse? Data)> UpdateAsync(
            string projectId, UpdateProjectRequest request, int userId, bool isAdmin);

        Task<(bool Success, string? Error, bool Forbidden)> ArchiveAsync(
            string projectId, int userId, bool isAdmin);
    }
}