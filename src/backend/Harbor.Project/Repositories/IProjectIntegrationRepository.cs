using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public interface IProjectIntegrationRepository
    {
        Task<int> CreateAsync(ProjectIntegrationEntity integration);
        Task<List<ProjectIntegrationEntity>> GetByProjectIdAsync(int projectId);
        Task<ProjectIntegrationEntity?> GetByIdAsync(int id);
        Task<bool> DeleteAsync(int id);
    }
}
