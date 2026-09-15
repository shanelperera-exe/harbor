using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;

namespace Harbor.Deployment.Services;

public class DeploymentService(IDeploymentRepository repository) : IDeploymentService
{
    private const int MaxPageSize = 100;
    private static readonly string[] ValidEnvironmentTypes = ["Development", "Staging", "Production"];

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
        if (deployment is null) return null;
        var logs = await repository.GetLogsAsync(id);
        return new DeploymentDetailsResponse { Id = deployment.Id, ProjectId = deployment.ProjectId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, FailureReason = string.Equals(deployment.Status, "Failed", StringComparison.OrdinalIgnoreCase) ? deployment.FailureReason : null, Logs = logs.Select(log => new DeploymentLogResponse { Timestamp = log.Timestamp, Level = log.Level, Message = log.Message }).ToList() };
    }

    public async Task<(bool Success, string? Error, int? DeploymentId)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin)
    {
        var projectAccess = await repository.GetProjectAccessAsync(request.ProjectId);
        if (!projectAccess.Exists) return (false, "Project not found.", null);
        if (projectAccess.IsArchived) return (false, "Project is archived.", null);
        if (!isAdmin && projectAccess.OwnerId != ownerId) return (false, "You do not have permission to deploy this project.", null);

        var environment = await repository.GetEnvironmentByNameAsync(request.ProjectId, request.Environment.Trim());
        if (environment is null || !environment.Value.IsActive) return (false, "The selected environment is not valid for this project.", null);
        if (!ValidEnvironmentTypes.Contains(environment.Value.Type)) return (false, "The selected environment type is not supported.", null);

        if (string.IsNullOrWhiteSpace(request.Version)) return (false, "Version is required.", null);

        var deployment = new DeploymentEntity
        {
            ProjectId = request.ProjectId,
            OwnerId = ownerId,
            Environment = request.Environment.Trim(),
            Version = request.Version.Trim(),
            CommitSha = request.CommitSha?.Trim(),
            Status = "Pending",
            StartedAt = DateTime.UtcNow
        };

        var deploymentId = await repository.CreateAsync(deployment);
        return (true, null, deploymentId);
    }

    private static DeploymentResponse ToResponse(DeploymentEntity deployment) => new() { Id = deployment.Id, ProjectId = deployment.ProjectId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt };
}
