using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Harbor.Deployment.IntegrationTests;

public class DeploymentRepositoryTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;
    private readonly DeploymentRepository _repository;

    public DeploymentRepositoryTests(DeploymentApiFactory factory)
    {
        _factory = factory;
        var scope = _factory.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<DbConnectionFactory>();
        _repository = new DeploymentRepository(dbFactory);
    }

    [Fact]
    public async Task DeploymentRepository_FullLifecycleAndQueries_Succeeds()
    {
        var ownerId = DeploymentApiFactory.SeedOwnerId;
        var serviceId = DeploymentApiFactory.SeedServiceId;

        // 1. CreateAsync
        var deployment = new DeploymentEntity
        {
            ServiceId = serviceId,
            OwnerId = ownerId,
            Environment = "Staging",
            Version = "v2.0.0",
            CommitSha = "abcdef123456",
            CommitMessage = "Feature update",
            Status = "Queued",
            WorkflowFile = "deploy.yml",
            WorkflowRef = "main"
        };

        var createdId = await _repository.CreateAsync(deployment);
        Assert.True(createdId > 0);

        // 2. GetByIdAsync & GetEntityByIdAsync
        var byId = await _repository.GetByIdAsync(createdId, ownerId);
        Assert.NotNull(byId);
        Assert.Equal(createdId, byId.Id);
        Assert.Equal("Staging", byId.Environment);

        var byEntityId = await _repository.GetEntityByIdAsync(createdId);
        Assert.NotNull(byEntityId);
        Assert.Equal(createdId, byEntityId.Id);

        // GetEntityByIdentifierAsync by PublicId or numeric string
        var byPublicId = await _repository.GetEntityByIdentifierAsync(byId.PublicId, ownerId, false);
        Assert.NotNull(byPublicId);
        Assert.Equal(createdId, byPublicId.Id);

        var byNumericId = await _repository.GetEntityByIdentifierAsync(createdId.ToString(), ownerId, false);
        Assert.NotNull(byNumericId);

        // Wrong owner
        var wrongOwner = await _repository.GetByIdAsync(createdId, 999999);
        Assert.Null(wrongOwner);

        // Admin can fetch by identifier
        var adminAccess = await _repository.GetEntityByIdentifierAsync(createdId.ToString(), 999999, isAdmin: true);
        Assert.NotNull(adminAccess);

        // 3. SetWorkflowRunAsync & GetByWorkflowRunIdAsync
        const long runId = 987654321;
        await _repository.SetWorkflowRunAsync(createdId, runId, "https://github.com/runs/987654321");
        var byRunId = await _repository.GetByWorkflowRunIdAsync(runId);
        Assert.NotNull(byRunId);
        Assert.Equal(createdId, byRunId.Id);

        // 4. UpdateTriggerResultAsync & UpdateStatusAsync
        await _repository.UpdateTriggerResultAsync(createdId, "Running", null, null);
        var runningDep = await _repository.GetByIdAsync(createdId, ownerId);
        Assert.Equal("Running", runningDep!.Status);

        await _repository.UpdateStatusAsync(createdId, "Succeeded", null);
        var successDep = await _repository.GetByIdAsync(createdId, ownerId);
        Assert.Equal("Succeeded", successDep!.Status);

        // 5. UpdateDeploymentUrlAsync & UpdateServiceDeploymentUrlAsync
        await _repository.UpdateDeploymentUrlAsync(createdId, "https://staging.harbor.local");
        await _repository.UpdateServiceDeploymentUrlAsync(serviceId, "https://staging.harbor.local");
        var withUrl = await _repository.GetByIdAsync(createdId, ownerId);
        Assert.Equal("https://staging.harbor.local", withUrl!.DeploymentUrl);

        // 6. AddLogsAsync & GetLogsAsync
        await _repository.AddLogsAsync(createdId, "Line 1: deploy started\nLine 2: deploy finished");
        var logs = await _repository.GetLogsAsync(createdId);
        Assert.NotEmpty(logs);
        Assert.Contains(logs, l => l.Message.Contains("Line 1: deploy started"));

        // 7. GetSucceededForRedeployAsync & CreateFromSourceAsync
        var redeploySource = await _repository.GetSucceededForRedeployAsync(createdId);
        Assert.NotNull(redeploySource);

        var copyId = await _repository.CreateFromSourceAsync(redeploySource);
        Assert.True(copyId > 0);
        Assert.NotEqual(createdId, copyId);

        // 8. GetHistoryAsync with various filters and paging
        var (itemsAll, totalAll) = await _repository.GetHistoryAsync(ownerId, null, null, null, null, 0, 10);
        Assert.True(totalAll > 0);
        Assert.Contains(itemsAll, d => d.Id == createdId);

        var (itemsFilterEnv, _) = await _repository.GetHistoryAsync(ownerId, null, "Staging", null, null, 0, 10);
        Assert.All(itemsFilterEnv, d => Assert.Equal("staging", d.Environment.ToLowerInvariant()));

        var (itemsFilterSvc, _) = await _repository.GetHistoryAsync(ownerId, null, null, serviceId.ToString(), null, 0, 10);
        Assert.All(itemsFilterSvc, d => Assert.Equal(serviceId, d.ServiceId));

        var (itemsFilterStatus, _) = await _repository.GetHistoryAsync(ownerId, null, null, null, "successful", 0, 10);
        Assert.All(itemsFilterStatus, d => Assert.Equal("successful", d.Status.ToLowerInvariant()));

        // Service overload for history
        var (historyBySvc, _) = await _repository.GetHistoryAsync(ownerId, serviceId, null, 0, 10);
        Assert.NotEmpty(historyBySvc);

        // Admin mode for history
        var (adminHistory, _) = await _repository.GetHistoryAsync(999999, null, null, null, null, 0, 10, isAdmin: true);
        Assert.True(adminHistory.Count > 0);

        // 9. Dashboard queries
        var dashboardRecent = await _repository.GetDashboardRecentDeploymentsAsync(ownerId, false, 5);
        Assert.NotNull(dashboardRecent);

        var dashboardProjects = await _repository.GetDashboardProjectsAsync(ownerId, false);
        Assert.NotNull(dashboardProjects);

        var dashboardMetrics = await _repository.GetDashboardMetricsAsync(ownerId, false);
        Assert.NotNull(dashboardMetrics);

        // 10. Service & Environment lookups
        var env = await _repository.GetEnvironmentByNameAsync(DeploymentApiFactory.SeedProjectId, "production");
        Assert.NotNull(env);
        Assert.True(env.Value.Exists);

        var repoName = await _repository.GetRepositoryNameAsync(serviceId);
        Assert.NotNull(repoName);
        Assert.Equal(DeploymentApiFactory.SeedRepoFullName, repoName);

        var workflowFile = await _repository.GetWorkflowFileAsync(serviceId);
        // Can be null or configured string
        Assert.True(workflowFile == null || workflowFile.Length > 0);

        var serviceAccess = await _repository.GetServiceAccessAsync(serviceId.ToString());
        Assert.True(serviceAccess.Exists);
        Assert.Equal(ownerId, serviceAccess.OwnerId);
    }

    [Fact]
    public async Task DeploymentRepository_CiRunOperations_Succeeds()
    {
        var ownerId = DeploymentApiFactory.SeedOwnerId;
        var serviceId = DeploymentApiFactory.SeedServiceId;
        var repoName = DeploymentApiFactory.SeedRepoFullName;

        // GetServiceByRepositoryAsync
        var svcInfo = await _repository.GetServiceByRepositoryAsync(repoName);
        Assert.NotNull(svcInfo);
        Assert.Equal(serviceId, svcInfo.Value.ServiceId);

        // CreateCiRunAsync
        var runId = 1122334455L;
        var ciRun = new CiRunEntity
        {
            ServiceId = serviceId,
            OwnerId = ownerId,
            WorkflowName = "Integration CI",
            WorkflowFile = "ci.yml",
            Branch = "main",
            CommitSha = "c1c1c1c1c1",
            Status = "in_progress",
            GitHubRunId = runId,
            GitHubRunUrl = $"https://github.com/{repoName}/actions/runs/{runId}"
        };

        var createdId = await _repository.CreateCiRunAsync(ciRun);
        Assert.True(createdId > 0);

        // GetCiRunByGitHubRunIdAsync
        var fetched = await _repository.GetCiRunByGitHubRunIdAsync(runId);
        Assert.NotNull(fetched);
        Assert.Equal("Integration CI", fetched.WorkflowName);
        Assert.Equal("in_progress", fetched.Status);

        // UpdateCiRunAsync
        var updatedCiRun = new CiRunEntity
        {
            Id = fetched.Id,
            ServiceId = fetched.ServiceId,
            OwnerId = fetched.OwnerId,
            WorkflowName = fetched.WorkflowName,
            WorkflowFile = fetched.WorkflowFile,
            Branch = fetched.Branch,
            CommitSha = fetched.CommitSha,
            Status = "completed",
            Conclusion = "success",
            GitHubRunId = fetched.GitHubRunId,
            GitHubRunUrl = fetched.GitHubRunUrl,
            StartedAt = fetched.StartedAt,
            CompletedAt = DateTime.UtcNow
        };
        var updatedResult = await _repository.UpdateCiRunAsync(updatedCiRun);
        Assert.True(updatedResult);

        var updated = await _repository.GetCiRunByGitHubRunIdAsync(runId);
        Assert.NotNull(updated);
        Assert.Equal("completed", updated.Status);
        Assert.Equal("success", updated.Conclusion);

        // GetCiRunsAsync & GetCiRunsTotalCountAsync
        var runs = await _repository.GetCiRunsAsync(ownerId, serviceId, 0, 10);
        Assert.NotEmpty(runs);

        var count = await _repository.GetCiRunsTotalCountAsync(ownerId, serviceId);
        Assert.True(count > 0);
    }
}
