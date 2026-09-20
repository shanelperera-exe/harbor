using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public interface IServiceRepository
    {
        Task<int> CreateAsync(ServiceEntity service);
        Task<ServiceEntity?> GetByIdAsync(int id);
        Task<ServiceEntity?> GetByIdOrPublicIdAsync(string identifier);
        Task<List<ServiceEntity>> GetByProjectIdAsync(int projectId);
        Task<bool> DeleteAsync(int id);
    }
}
