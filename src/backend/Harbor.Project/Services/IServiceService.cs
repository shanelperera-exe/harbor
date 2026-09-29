using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IServiceService
    {
        Task<(bool Success, string? Error, ServiceResponse? Data)> CreateAsync(string projectId, CreateServiceRequest request, int userId, bool isAdmin);
        Task<(bool Success, string? Error, List<ServiceResponse>? Data)> GetByProjectIdAsync(string projectId, int userId, bool isAdmin);
        Task<(bool Success, string? Error, ServiceResponse? Data)> GetByIdAsync(string serviceId, int userId, bool isAdmin);
        Task<(bool Success, string? Error)> DeleteAsync(string serviceId, int userId, bool isAdmin);
        Task<(bool Success, string? Error, ServiceResponse? Data)> UpdateAsync(string serviceId, UpdateServiceRequest request, int userId, bool isAdmin);
    }
}
