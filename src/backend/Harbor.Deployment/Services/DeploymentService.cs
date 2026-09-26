using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Kafka;
using Harbor.Contracts.Kafka;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Services;

public class DeploymentService : IDeploymentService
{
    private readonly IDeploymentRepository repository;
    private readonly IGitHubActionsClient gitHubActionsClient;
    private readonly IOptions<GitHubActionsOptions> options;
    private readonly IInstallationTokenResolver? installationTokenResolver;
    private readonly IKafkaProducerService kafkaProducerService;
    private readonly ILogger<DeploymentService> logger;

    public DeploymentService(
        IDeploymentRepository repository,
        IGitHubActionsClient? gitHubActionsClient = null,
        IOptions<GitHubActionsOptions>? options = null,
        IInstallationTokenResolver? installationTokenResolver = null,
        IKafkaProducerService? kafkaProducerService = null,
        ILogger<DeploymentService>? logger = null)
    {
        this.repository = repository;
        this.gitHubActionsClient = gitHubActionsClient ?? new DisabledGitHubActionsClient();
        this.options = options ?? Microsoft.Extensions.Options.Options.Create(new GitHubActionsOptions());
        this.installationTokenResolver = installationTokenResolver;
        this.kafkaProducerService = kafkaProducerService ?? new DisabledKafkaProducerService();
        this.logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<DeploymentService>.Instance;
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
        public Task<(long RunId, string RunUrl)?> PollForRunAsync(string owner, string repository, string workflowFile, string installationToken, DateTime dispatchedAt, int timeoutSeconds = 30, CancellationToken cancellationToken = default) =>
            Task.FromResult<(long, string)?>(null);
        public Task<CiCheckResult> GetCiStatusAsync(string owner, string repository, string gitRef, string installationToken, CancellationToken cancellationToken = default) =>
            Task.FromResult(new CiCheckResult("unknown"));
        public Task<string?> FetchRunLogsAsync(string owner, string repository, long runId, string installationToken, CancellationToken cancellationToken = default) =>
            Task.FromResult<string?>(null);
    }

    internal sealed class DisabledKafkaProducerService : IKafkaProducerService
    {
        public Task PublishDeploymentEventAsync(DeploymentLifecycleEvent @event) => Task.CompletedTask;
    }

    public async Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId)
    {
        var deployment = await repository.GetByIdAsync(id, ownerId);
        if (deployment is null) return null;
        var logs = await repository.GetLogsAsync(id);
        return new DeploymentDetailsResponse { Id = deployment.Id, ServiceId = deployment.ServiceId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, WorkflowFile = deployment.WorkflowFile, WorkflowRef = deployment.WorkflowRef, WorkflowRunUrl = deployment.WorkflowRunUrl, FailureReason = string.Equals(deployment.Status, "Failed", StringComparison.OrdinalIgnoreCase) ? deployment.FailureReason : null, TriggerError = deployment.TriggerError, Logs = logs.Select(log => new DeploymentLogResponse { Timestamp = log.Timestamp, Level = log.Level, Message = log.Message }).ToList() };
    }

    public async Task<(bool Success, string? Error, int? DeploymentId, string Status, string? CiWarning)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin)
    {
        if (string.IsNullOrWhiteSpace(request.ServiceId)) return (false, "Service is required.", null, "Failed", null);
        var serviceAccess = await repository.GetServiceAccessAsync(request.ServiceId);
        if (!serviceAccess.Exists) return (false, "Service not found.", null, "Failed", null);
        if (serviceAccess.IsArchived) return (false, "Project is archived.", null, "Failed", null);
        if (!isAdmin && serviceAccess.OwnerId != ownerId) return (false, "You do not have permission to deploy this service.", null, "Failed", null);

        var environment = await repository.GetEnvironmentByNameAsync(serviceAccess.ProjectId, request.Environment.Trim());
        if (environment is null || !environment.Value.IsActive) return (false, "The selected environment is not valid for this project.", null, "Failed", null);
        if (!ValidEnvironmentTypes.Contains(environment.Value.Type)) return (false, "The selected environment type is not supported.", null, "Failed", null);

        if (string.IsNullOrWhiteSpace(request.Version)) return (false, "Version is required.", null, "Failed", null);
        var workflowFile = await repository.GetWorkflowFileAsync(serviceAccess.RealServiceId) ?? options.Value.DefaultWorkflowFile;
        var workflowRef = string.IsNullOrWhiteSpace(request.CommitSha) ? request.Branch?.Trim() : request.CommitSha.Trim();
        if (string.IsNullOrWhiteSpace(workflowRef)) return (false, "A branch or commit is required.", null, "Failed", null);
        var repositoryName = await repository.GetRepositoryNameAsync(serviceAccess.RealServiceId);
        if (string.IsNullOrWhiteSpace(repositoryName) || !repositoryName.Contains('/')) return (false, "The service does not have a valid GitHub repository configured.", null, "Failed", null);

        // Resolve token early — needed for both CI gate check and workflow dispatch
        string? installationToken = null;
        try
        {
            installationToken = await installationTokenResolver?.GetInstallationTokenAsync(ownerId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to resolve GitHub App installation token for user {OwnerId} — proceeding without CI gate check.", ownerId);
        }

        // ── CI Gate: warn if CI checks are failing on the target branch ───────────────────────────
        string? ciWarning = null;
        if (!string.IsNullOrWhiteSpace(installationToken) && !request.OverrideCiGate)
        {
            var repoParts = repositoryName.Split('/', 2);
            var ciResult = await gitHubActionsClient.GetCiStatusAsync(repoParts[0], repoParts[1], workflowRef, installationToken);
            ciWarning = ciResult.Status switch
            {
                "failing" => ciResult.Summary,
                "pending" => ciResult.Summary,
                _ => null
            };
            if (ciWarning is not null && !request.OverrideCiGate)
                return (false, ciWarning, null, "CiGate", ciWarning);
        }

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
            await PublishEventAsync(deploymentId, serviceAccess.RealServiceId.ToString(), "Failed", deployment.Environment, deployment.Version, result.Error);
            return (true, result.Error, deploymentId, "Failed", null);
        }

        await repository.UpdateTriggerResultAsync(deploymentId, "Running", null, null);
        await PublishEventAsync(deploymentId, serviceAccess.RealServiceId.ToString(), "Running", deployment.Environment, deployment.Version, null);

        // ── Background: capture GitHub Actions run ID + URL for webhook correlation ──────────────
        if (!string.IsNullOrWhiteSpace(installationToken))
        {
            var captureOwner = parts[0];
            var captureRepo = parts[1];
            var captureWorkflow = workflowFile;
            var captureToken = installationToken;
            var captureDeploymentId = deploymentId;
            var captureDispatchedAt = deployment.StartedAt;
            _ = Task.Run(async () =>
            {
                try
                {
                    var run = await gitHubActionsClient.PollForRunAsync(
                        captureOwner, captureRepo, captureWorkflow, captureToken, captureDispatchedAt);
                    if (run.HasValue)
                        await repository.SetWorkflowRunAsync(captureDeploymentId, run.Value.RunId, run.Value.RunUrl);
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine($"[Harbor] Failed to capture run for deployment {captureDeploymentId}: {ex.Message}");
                }
            });
        }

        return (true, null, deploymentId, "Running", null);
    }

    public async Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason)
    {
        var result = await repository.UpdateTriggerResultAsync(deploymentId, status, failureReason, null);
        if (result)
        {
            try
            {
                var deployment = await repository.GetEntityByIdAsync(deploymentId);
                if (deployment != null)
                {
                    await PublishEventAsync(deploymentId, deployment.ServiceId.ToString(), status, deployment.Environment, deployment.Version, failureReason);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to publish Kafka event during UpdateStatusAsync for deployment {DeploymentId}", deploymentId);
            }
        }
        return result;
    }

    public async Task<CiRunListResponse> GetCiRunsAsync(int ownerId, string serviceId, int page, int pageSize)
    {
        var serviceAccess = await repository.GetServiceAccessAsync(serviceId);
        if (!serviceAccess.Exists)
            return new CiRunListResponse { Items = Array.Empty<CiRunResponse>(), Page = page, PageSize = pageSize, TotalCount = 0 };

        var safePage = Math.Max(1, page);
        var safeSize = Math.Clamp(pageSize, 1, MaxPageSize);
        var skip = (safePage - 1) * safeSize;

        var items = await repository.GetCiRunsAsync(ownerId, serviceAccess.RealServiceId, skip, safeSize);
        var total = await repository.GetCiRunsTotalCountAsync(ownerId, serviceAccess.RealServiceId);

        return new CiRunListResponse
        {
            Items = items.Select(ToCiRunResponse).ToList(),
            Page = safePage,
            PageSize = safeSize,
            TotalCount = total
        };
    }

    private static CiRunResponse ToCiRunResponse(CiRunEntity ciRun) => new()
    {
        Id = ciRun.Id,
        ServiceId = ciRun.ServiceId,
        WorkflowName = ciRun.WorkflowName,
        WorkflowFile = ciRun.WorkflowFile,
        Branch = ciRun.Branch,
        CommitSha = ciRun.CommitSha,
        Conclusion = ciRun.Conclusion,
        Status = ciRun.Status,
        GitHubRunId = ciRun.GitHubRunId,
        GitHubRunUrl = ciRun.GitHubRunUrl,
        StartedAt = ciRun.StartedAt,
        CompletedAt = ciRun.CompletedAt,
    };

    private static DeploymentResponse ToResponse(DeploymentEntity deployment) => new() { Id = deployment.Id, PublicId = string.IsNullOrEmpty(deployment.PublicId) ? deployment.Id.ToString() : deployment.PublicId, ServiceId = deployment.ServiceId, Environment = deployment.Environment, Version = deployment.Version, CommitSha = deployment.CommitSha, Status = deployment.Status, StartedAt = deployment.StartedAt, CompletedAt = deployment.CompletedAt, WorkflowFile = deployment.WorkflowFile, WorkflowRef = deployment.WorkflowRef, ProjectName = deployment.ProjectName, ServiceName = deployment.ServiceName, UserName = deployment.UserName };

    // ── Deployment rollback (2.2) ──────────────────────────────────────────────

    public async Task<(bool Success, string? Error, int? DeploymentId, string Status, string? CiWarning)> RedeployAsync(int sourceDeploymentId, int ownerId, bool isAdmin)
    {
        // Look up the source deployment — must be Succeeded
        var source = await repository.GetSucceededForRedeployAsync(sourceDeploymentId);
        if (source is null)
            return (false, "Succeeded deployment not found.", null, "Failed", null);

        // Verify the caller has access to the source deployment's service
        var serviceAccess = await repository.GetServiceAccessAsync(source.ServiceId.ToString());
        if (!serviceAccess.Exists || serviceAccess.IsArchived)
            return (false, "The source deployment's service is no longer available.", null, "Failed", null);
        if (!isAdmin && serviceAccess.OwnerId != ownerId)
            return (false, "You do not have permission to redeploy this deployment.", null, "Failed", null);

        // Build a create request from the source deployment's parameters
        // OverrideCiGate = true because the previous run succeeded (CI was passing)
        var request = new CreateDeploymentRequest
        {
            ServiceId = source.ServiceId.ToString(),
            Environment = source.Environment,
            Version = source.Version,
            CommitSha = source.CommitSha,
            Branch = source.WorkflowRef,
            OverrideCiGate = true,
        };

        return await CreateAsync(request, ownerId, isAdmin: true);
    }

    private async Task PublishEventAsync(int deploymentId, string serviceId, string status, string environment, string version, string? failureReason)
    {
        try
        {
            var @event = new DeploymentLifecycleEvent
            {
                DeploymentId = deploymentId,
                ServiceId = serviceId,
                Status = status,
                Environment = environment,
                Version = version,
                Timestamp = DateTime.UtcNow,
                FailureReason = failureReason
            };
            await kafkaProducerService.PublishDeploymentEventAsync(@event);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to publish deployment lifecycle event for deployment {DeploymentId}", deploymentId);
        }
    }
}
