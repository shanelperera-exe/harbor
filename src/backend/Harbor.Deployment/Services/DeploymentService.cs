using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;

namespace Harbor.Deployment.Services;

public class DeploymentService(IDeploymentRepository repository) : IDeploymentService
{
    private const int MaxPageSize = 100;

    public async Task<DeploymentListResponse> GetHistoryAsync(int ownerId, DeploymentHistoryQuery query)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var (items, totalCount) = await repository.GetHistoryAsync(ownerId, query.ProjectId, query.Status?.Trim(), (page - 1) * pageSize, pageSize);
        return new DeploymentListResponse { Items = items.Select(ToResponse).ToList(), Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    public async Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId)
    {
        var deployment = await repository.GetByIdAsync(id, ownerId);
        if (deployment is null) return null; // intentionally indistinguishable from not found to avoid data leakage
        var logs = await repository.GetLogsAsync(id);
        return new DeploymentDetailsResponse { Id = deployment.Id, ProjectId = deployment.ProjectId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, FailureReason = string.Equals(deployment.Status, "Failed", StringComparison.OrdinalIgnoreCase) ? deployment.FailureReason : null, Logs = logs.Select(log => new DeploymentLogResponse { Timestamp = log.Timestamp, Level = log.Level, Message = log.Message }).ToList() };
    }

    private static DeploymentResponse ToResponse(DeploymentEntity deployment) => new() { Id = deployment.Id, ProjectId = deployment.ProjectId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt };
}
