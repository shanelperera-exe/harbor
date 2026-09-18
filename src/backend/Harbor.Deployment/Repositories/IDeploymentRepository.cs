using Harbor.Deployment.Models;

namespace Harbor.Deployment.Repositories;

public interface IDeploymentRepository
{
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int? serviceId, string? status, int skip, int take);
    Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId);
    Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId);
    Task<int> CreateAsync(DeploymentEntity deployment);
    Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId)> GetServiceAccessAsync(int serviceId);
    Task<(bool Exists, bool IsActive, string Type)?> GetEnvironmentByNameAsync(int projectId, string environmentName);
}
