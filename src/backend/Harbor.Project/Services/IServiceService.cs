using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IServiceService
    {
        Task<(bool Success, string? Error, ServiceResponse? Data)> CreateAsync(int projectId, CreateServiceRequest request, int userId, bool isAdmin);
        Task<(bool Success, string? Error, List<ServiceResponse>? Data)> GetByProjectIdAsync(int projectId, int userId, bool isAdmin);
        Task<(bool Success, string? Error)> DeleteAsync(int serviceId, int userId, bool isAdmin);
    }
}
