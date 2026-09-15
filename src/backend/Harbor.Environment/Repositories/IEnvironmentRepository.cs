using Harbor.Environment.Models;

namespace Harbor.Environment.Repositories;

public interface IEnvironmentRepository
{
    Task<int> CreateAsync(EnvironmentEntity environment);
    Task<List<EnvironmentEntity>> GetByProjectIdAsync(int projectId);
    Task<EnvironmentEntity?> GetByIdAsync(int environmentId, int projectId);
    Task<bool> UpdateAsync(EnvironmentEntity environment);
    Task<bool> DeleteAsync(int environmentId, int projectId);
    Task<bool> DeactivateAsync(int environmentId, int projectId, DateTime deactivatedAt);
    Task<bool> HasDeploymentHistoryAsync(int projectId, string environmentName);
    Task<(bool Exists, int OwnerId, bool IsArchived)> GetProjectAccessAsync(int projectId);
    Task<bool> TypeExistsForProjectAsync(int projectId, string type, int? excludeEnvironmentId = null);
}
