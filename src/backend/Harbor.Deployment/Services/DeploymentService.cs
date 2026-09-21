using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Services;

public class DeploymentService : IDeploymentService
{
    private readonly IDeploymentRepository repository;
    private readonly IGitHubActionsClient gitHubActionsClient;
    private readonly IOptions<GitHubActionsOptions> options;
    private readonly IInstallationTokenResolver? installationTokenResolver;

    public DeploymentService(
        IDeploymentRepository repository,
        IGitHubActionsClient? gitHubActionsClient = null,
        IOptions<GitHubActionsOptions>? options = null,
        IInstallationTokenResolver? installationTokenResolver = null)
    {
        this.repository = repository;
        this.gitHubActionsClient = gitHubActionsClient ?? new DisabledGitHubActionsClient();
        this.options = options ?? Microsoft.Extensions.Options.Options.Create(new GitHubActionsOptions());
        this.installationTokenResolver = installationTokenResolver;
    }
    private const int MaxPageSize = 100;
    private static readonly string[] ValidEnvironmentTypes = ["Development", "Staging", "Production"];

    public async Task<DeploymentListResponse> GetHistoryAsync(int ownerId, DeploymentHistoryQuery query)
    {
        var page = Math.Max(1, query.Page);
        var pageSize = Math.Clamp(query.PageSize, 1, MaxPageSize);
        var (items, totalCount) = await repository.GetHistoryAsync(ownerId, query.ServiceId, query.Status?.Trim(), (page - 1) * pageSize, pageSize);
        return new DeploymentListResponse { Items = items.Select(ToResponse).ToList(), Page = page, PageSize = pageSize, TotalCount = totalCount };
    }

    internal sealed class DisabledGitHubActionsClient : IGitHubActionsClient
    {
        public Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default) =>
            Task.FromResult(new WorkflowDispatchResult(false, "GitHub Actions is not configured."));
    }

    public async Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId)
    {
        var deployment = await repository.GetByIdAsync(id, ownerId);
        if (deployment is null) return null;
        var logs = await repository.GetLogsAsync(id);
        return new DeploymentDetailsResponse { Id = deployment.Id, ServiceId = deployment.ServiceId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, WorkflowFile = deployment.WorkflowFile, WorkflowRef = deployment.WorkflowRef, FailureReason = string.Equals(deployment.Status, "Failed", StringComparison.OrdinalIgnoreCase) ? deployment.FailureReason : null, TriggerError = deployment.TriggerError, Logs = logs.Select(log => new DeploymentLogResponse { Timestamp = log.Timestamp, Level = log.Level, Message = log.Message }).ToList() };
    }

    public async Task<(bool Success, string? Error, int? DeploymentId, string Status)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.ServiceId)) return (false, "Service is required.", null, "Failed");
        var serviceAccess = await repository.GetServiceAccessAsync(request.ServiceId);
        if (!serviceAccess.Exists) return (false, "Service not found.", null, "Failed");
        if (serviceAccess.IsArchived) return (false, "Project is archived.", null, "Failed");
        if (!isAdmin && serviceAccess.OwnerId != ownerId) return (false, "You do not have permission to deploy this service.", null, "Failed");

        var environment = await repository.GetEnvironmentByNameAsync(serviceAccess.ProjectId, request.Environment.Trim());
        if (environment is null || !environment.Value.IsActive) return (false, "The selected environment is not valid for this project.", null, "Failed");
        if (!ValidEnvironmentTypes.Contains(environment.Value.Type)) return (false, "The selected environment type is not supported.", null, "Failed");

        if (string.IsNullOrWhiteSpace(request.Version)) return (false, "Version is required.", null, "Failed");
        var workflowFile = await repository.GetWorkflowFileAsync(serviceAccess.RealServiceId) ?? options.Value.DefaultWorkflowFile;
        var workflowRef = string.IsNullOrWhiteSpace(request.CommitSha) ? request.Branch?.Trim() : request.CommitSha.Trim();
        if (string.IsNullOrWhiteSpace(workflowRef)) return (false, "A branch or commit is required.", null, "Failed");
        var repositoryName = await repository.GetRepositoryNameAsync(serviceAccess.RealServiceId);
        if (string.IsNullOrWhiteSpace(repositoryName) || !repositoryName.Contains('/')) return (false, "The service does not have a valid GitHub repository configured.", null, "Failed");

        var deployment = new DeploymentEntity
        {
            PublicId = Harbor.Common.Utilities.IdGenerator.DeploymentId(),
            ServiceId = serviceAccess.RealServiceId,
            OwnerId = ownerId,
            Environment = request.Environment.Trim(),
            Version = request.Version.Trim(),
            CommitSha = request.CommitSha?.Trim(),
            Status = "Pending",
            WorkflowFile = workflowFile,
            WorkflowRef = workflowRef,
            StartedAt = DateTime.UtcNow
        };

        var deploymentId = await repository.CreateAsync(deployment);
        var parts = repositoryName.Split('/', 2);

        // Resolve the user's GitHub App installation token for workflow dispatch
        var installationToken = await installationTokenResolver?.GetInstallationTokenAsync(ownerId);
        var result = await gitHubActionsClient.DispatchAsync(new WorkflowDispatchRequest(
            parts[0], parts[1], workflowFile, workflowRef,
            new Dictionary<string, string>
            {
                ["environment"] = deployment.Environment,
                ["project"] = serviceAccess.ProjectId.ToString(),
                ["service"] = serviceAccess.RealServiceId.ToString(),
                ["deployment_id"] = deploymentId.ToString(),
                ["version"] = deployment.Version,
                ["commit_sha"] = deployment.CommitSha ?? string.Empty
            },
            installationToken));

        if (!result.Succeeded)
        {
            await repository.UpdateTriggerResultAsync(deploymentId, "Failed", result.Error, result.Error);
            return (true, result.Error, deploymentId, "Failed");
        }

        await repository.UpdateTriggerResultAsync(deploymentId, "Running", null, null);
        return (true, null, deploymentId, "Running");
    }

    public Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason) =>
        repository.UpdateTriggerResultAsync(deploymentId, status, failureReason, null);

    private static DeploymentResponse ToResponse(DeploymentEntity deployment) => new() { Id = deployment.Id, PublicId = string.IsNullOrEmpty(deployment.PublicId) ? deployment.Id.ToString() : deployment.PublicId, ServiceId = deployment.ServiceId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, WorkflowFile = deployment.WorkflowFile, WorkflowRef = deployment.WorkflowRef };
}
