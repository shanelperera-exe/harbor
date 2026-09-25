using Harbor.Deployment.Models;

namespace Harbor.Deployment.Repositories;

public interface IDeploymentRepository
{
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, string? serviceId, string? status, int skip, int take);
    Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int serviceId, string? status, int skip, int take);
    Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId);
    Task<DeploymentEntity?> GetEntityByIdAsync(int id);
    Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId);
    Task<int> CreateAsync(DeploymentEntity deployment);
    Task<bool> UpdateTriggerResultAsync(int deploymentId, string status, string? failureReason, string? triggerError);
    Task<string?> GetRepositoryNameAsync(int serviceId);
    Task<string?> GetWorkflowFileAsync(int serviceId);
    Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId, int RealServiceId)> GetServiceAccessAsync(string serviceIdOrPublicId);
    Task<(bool Exists, bool IsActive, string Type)?> GetEnvironmentByNameAsync(int projectId, string environmentName);
    Task SetWorkflowRunAsync(int deploymentId, long workflowRunId, string runUrl);
    Task<DeploymentEntity?> GetByWorkflowRunIdAsync(long workflowRunId);
    Task AddLogsAsync(int deploymentId, string logText);

    // ── CI Run tracking (2.1) ──────────────────────────────────────────────────
    Task<int> CreateCiRunAsync(CiRunEntity ciRun);
    Task<bool> UpdateCiRunAsync(CiRunEntity ciRun);
    Task<IReadOnlyList<CiRunEntity>> GetCiRunsAsync(int ownerId, int serviceId, int skip, int take);
    Task<int> GetCiRunsTotalCountAsync(int ownerId, int serviceId);
    Task<CiRunEntity?> GetCiRunByGitHubRunIdAsync(long githubRunId);

    // ── Service lookup by repository (used by webhook to map CI runs to services) ──
    Task<(int? ServiceId, int? OwnerId)?> GetServiceByRepositoryAsync(string repositoryName);

    // ── Deployment rollback (2.2) ──────────────────────────────────────────────
    /// <summary>Fetches a succeeded deployment by ID (ownership verified in service layer).</summary>
    Task<DeploymentEntity?> GetSucceededForRedeployAsync(int deploymentId);

    /// <summary>Creates a fresh deployment record as a copy of a previous one.</summary>
    Task<int> CreateFromSourceAsync(DeploymentEntity source);
}