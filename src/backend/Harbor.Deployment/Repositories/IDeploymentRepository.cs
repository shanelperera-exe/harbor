using Harbor.Deployment.Models;

namespace Harbor.Deployment.Repositories;

public interface IDeploymentRepository
{
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, string? serviceId, string? status, int skip, int take);
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int serviceId, string? status, int skip, int take);
    Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId);
    Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId);
    Task<int> CreateAsync(DeploymentEntity deployment);
    Task<bool> UpdateTriggerResultAsync(int deploymentId, string status, string? failureReason, string? triggerError);
    Task<string?> GetRepositoryNameAsync(int serviceId);
    Task<string?> GetWorkflowFileAsync(int serviceId);
    Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId, int RealServiceId)> GetServiceAccessAsync(string serviceIdOrPublicId);
    Task<(bool Exists, bool IsActive, string Type)?> GetEnvironmentByNameAsync(int projectId, string environmentName);
}
