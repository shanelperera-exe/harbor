using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IProjectService
    {
        Task<(bool Success, string? Error, ProjectResponse? Data)> CreateAsync(CreateProjectRequest request, int ownerId);
        Task<List<ProjectResponse>> GetAccessibleProjectsAsync(int userId, bool isAdmin);
    }
}