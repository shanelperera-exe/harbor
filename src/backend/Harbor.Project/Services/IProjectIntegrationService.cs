using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IProjectIntegrationService
    {
        Task<(bool Success, string? Error, ProjectIntegrationResponse? Data)> CreateAsync(string projectId, CreateProjectIntegrationRequest request, int userId, bool isAdmin);
        Task<(bool Success, string? Error, List<ProjectIntegrationResponse>? Data)> GetByProjectIdAsync(string projectId, int userId, bool isAdmin);
        Task<(bool Success, string? Error)> DeleteAsync(int id, int userId, bool isAdmin);
    }
}
