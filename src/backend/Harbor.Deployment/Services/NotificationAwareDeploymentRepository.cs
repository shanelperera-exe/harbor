using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.Logging;

namespace Harbor.Deployment.Services;

/// <summary>
/// Decorator for <see cref="IDeploymentRepository"/> that creates in-app notifications
/// when a deployment transitions to a terminal state (Successful or Failed).
/// All other calls are forwarded to the inner repository unchanged.
/// </summary>
public class NotificationAwareDeploymentRepository(
    IDeploymentRepository inner,
    INotificationRepository notificationRepository,
    ILogger<NotificationAwareDeploymentRepository> logger) : IDeploymentRepository
{
    // ── Notification-aware override ───────────────────────────────────────────

    public async Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason = null)
    {
        var updated = await inner.UpdateStatusAsync(deploymentId, status, failureReason);

        if (updated && (status == "Successful" || status == "Failed"))
        {
            await TryCreateNotificationAsync(deploymentId, status, failureReason);
        }

        return updated;
    }

    // ── Notification helper ───────────────────────────────────────────────────

    private async Task TryCreateNotificationAsync(int deploymentId, string status, string? failureReason)
    {
        try
        {
            // Fetch the full deployment to get OwnerId and context metadata.
            var deployment = await inner.GetEntityByIdAsync(deploymentId);
            if (deployment == null)
            {
                logger.LogWarning("NotificationAwareDeploymentRepository: deployment {DeploymentId} not found after status update; skipping notification.", deploymentId);
                return;
            }

            var type    = status == "Successful" ? "success" : "failure";
            var service = deployment.ServiceName ?? $"Service #{deployment.ServiceId}";
            var env     = deployment.Environment;
            var version = deployment.Version;

            string title;
            string message;

            if (status == "Successful")
            {
                title   = $"Deployment succeeded — {service}";
                message = $"Version {version} deployed successfully to {env}.";
            }
            else
            {
                title   = $"Deployment failed — {service}";
                var reason = string.IsNullOrWhiteSpace(failureReason) ? "No failure reason provided." : failureReason;
                message = $"Version {version} failed to deploy to {env}. Reason: {reason}";
            }

            var notification = new NotificationEntity
            {
                UserId       = deployment.OwnerId,
                DeploymentId = deploymentId,
                Type         = type,
                Title        = title,
                Message      = message,
            };

            var notificationId = await notificationRepository.CreateAsync(notification);
            logger.LogInformation(
                "Notification {NotificationId} ({Type}) created for user {UserId} — deployment {DeploymentId}.",
                notificationId, type, deployment.OwnerId, deploymentId);
        }
        catch (Exception ex)
        {
            // Never let notification creation break the deployment flow.
            logger.LogError(ex, "Failed to create notification for deployment {DeploymentId}.", deploymentId);
        }
    }

    // ── Forwarded members ─────────────────────────────────────────────────────

    public Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, string? projectId, string? environment, string? serviceId, string? status, int skip, int take)
        => inner.GetHistoryAsync(ownerId, projectId, environment, serviceId, status, skip, take);

    public Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int serviceId, string? status, int skip, int take)
        => inner.GetHistoryAsync(ownerId, serviceId, status, skip, take);

    public Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId)
        => inner.GetByIdAsync(id, ownerId);

    public Task<DeploymentEntity?> GetEntityByIdAsync(int id)
        => inner.GetEntityByIdAsync(id);

    public Task<DeploymentEntity?> GetEntityByIdentifierAsync(string identifier, int userId, bool isAdmin)
        => inner.GetEntityByIdentifierAsync(identifier, userId, isAdmin);

    public Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId)
        => inner.GetLogsAsync(deploymentId);

    public Task<int> CreateAsync(DeploymentEntity deployment)
        => inner.CreateAsync(deployment);

    public Task<bool> UpdateTriggerResultAsync(int deploymentId, string status, string? failureReason, string? triggerError)
        => inner.UpdateTriggerResultAsync(deploymentId, status, failureReason, triggerError);

    public Task<string?> GetRepositoryNameAsync(int serviceId)
        => inner.GetRepositoryNameAsync(serviceId);

    public Task<string?> GetWorkflowFileAsync(int serviceId)
        => inner.GetWorkflowFileAsync(serviceId);

    public Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId, int RealServiceId)> GetServiceAccessAsync(string serviceIdOrPublicId)
        => inner.GetServiceAccessAsync(serviceIdOrPublicId);

    public Task<(bool Exists, bool IsActive, string Type, string? DeploymentUrl)?> GetEnvironmentByNameAsync(int projectId, string environmentName)
        => inner.GetEnvironmentByNameAsync(projectId, environmentName);

    public Task SetWorkflowRunAsync(int deploymentId, long workflowRunId, string runUrl)
        => inner.SetWorkflowRunAsync(deploymentId, workflowRunId, runUrl);

    public Task<DeploymentEntity?> GetByWorkflowRunIdAsync(long workflowRunId)
        => inner.GetByWorkflowRunIdAsync(workflowRunId);

    public Task AddLogsAsync(int deploymentId, string logText)
        => inner.AddLogsAsync(deploymentId, logText);

    public Task<int> CreateCiRunAsync(CiRunEntity ciRun)
        => inner.CreateCiRunAsync(ciRun);

    public Task<bool> UpdateCiRunAsync(CiRunEntity ciRun)
        => inner.UpdateCiRunAsync(ciRun);

    public Task<IReadOnlyList<CiRunEntity>> GetCiRunsAsync(int ownerId, int serviceId, int skip, int take)
        => inner.GetCiRunsAsync(ownerId, serviceId, skip, take);

    public Task<int> GetCiRunsTotalCountAsync(int ownerId, int serviceId)
        => inner.GetCiRunsTotalCountAsync(ownerId, serviceId);

    public Task<CiRunEntity?> GetCiRunByGitHubRunIdAsync(long githubRunId)
        => inner.GetCiRunByGitHubRunIdAsync(githubRunId);

    public Task<(int? ServiceId, int? OwnerId)?> GetServiceByRepositoryAsync(string repositoryName)
        => inner.GetServiceByRepositoryAsync(repositoryName);

    public Task<DeploymentEntity?> GetSucceededForRedeployAsync(int deploymentId)
        => inner.GetSucceededForRedeployAsync(deploymentId);

    public Task<int> CreateFromSourceAsync(DeploymentEntity source)
        => inner.CreateFromSourceAsync(source);

    public Task<IReadOnlyList<DashboardProjectEntity>> GetDashboardProjectsAsync(int userId, bool isAdmin)
        => inner.GetDashboardProjectsAsync(userId, isAdmin);

    public Task<IReadOnlyList<DashboardDeploymentEntity>> GetDashboardRecentDeploymentsAsync(int userId, bool isAdmin, int limit = 10)
        => inner.GetDashboardRecentDeploymentsAsync(userId, isAdmin, limit);

    public Task<DashboardMetricsEntity> GetDashboardMetricsAsync(int userId, bool isAdmin)
        => inner.GetDashboardMetricsAsync(userId, isAdmin);
}
