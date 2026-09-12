using Harbor.Deployment.Models;

namespace Harbor.Deployment.Repositories;

public interface IDeploymentRepository
{
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int? projectId, string? status, int skip, int take);
    Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId);
    Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId);
}
