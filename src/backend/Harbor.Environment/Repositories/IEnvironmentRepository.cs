using Harbor.Environment.Models;

namespace Harbor.Environment.Repositories;

public interface IEnvironmentRepository
{
    Task<int> CreateAsync(EnvironmentEntity environment);
    Task<List<EnvironmentEntity>> GetByProjectIdAsync(int projectId);
    Task<(bool Exists, int OwnerId, bool IsArchived)> GetProjectAccessAsync(int projectId);
    Task<bool> TypeExistsForProjectAsync(int projectId, string type);
}
