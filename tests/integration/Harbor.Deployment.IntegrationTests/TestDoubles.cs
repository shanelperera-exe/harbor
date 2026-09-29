using Harbor.Deployment.Kafka;
using Harbor.Deployment.Services;
using Harbor.Contracts.Kafka;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// Test double for IGitHubActionsClient that simulates successful workflow dispatch.
/// Used so deployment creation tests don't require a live GitHub connection.
/// </summary>
public sealed class TestGitHubActionsClient : IGitHubActionsClient
{
    public Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default) =>
        Task.FromResult(new WorkflowDispatchResult(true, null, 204));

    public Task<(long RunId, string RunUrl)?> PollForRunAsync(
        string owner, string repository, string workflowFile, string installationToken,
        DateTime dispatchedAt, int timeoutSeconds = 30, CancellationToken cancellationToken = default) =>
        Task.FromResult<(long, string)?>((99999, "https://github.com/test-owner/test-repo/actions/runs/99999"));

    public Task<CiCheckResult> GetCiStatusAsync(
        string owner, string repository, string gitRef, string installationToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(new CiCheckResult("passing", "All CI checks passed."));

    public Task<string?> FetchRunLogsAsync(
        string owner, string repository, long runId, string installationToken,
        CancellationToken cancellationToken = default) =>
        Task.FromResult<string?>(null);
}

/// <summary>
/// Test double for IInstallationTokenResolver that always returns a dummy token.
/// </summary>
public sealed class TestInstallationTokenResolver : IInstallationTokenResolver
{
    public Task<string?> GetInstallationTokenAsync(int userId) =>
        Task.FromResult<string?>("test-installation-token");
}

/// <summary>
/// Test double for IKafkaProducerService that records published events instead of
/// contacting a broker. Without this, the real producer resolves the bootstrap
/// servers from the developer's .env and blocks the test run on connection timeouts.
/// </summary>
public sealed class TestKafkaProducerService : IKafkaProducerService
{
    private readonly List<DeploymentLifecycleEvent> _events = new();
    private readonly Lock _gate = new();

    public IReadOnlyList<DeploymentLifecycleEvent> PublishedEvents
    {
        get { lock (_gate) return _events.ToList(); }
    }

    public Task PublishDeploymentEventAsync(DeploymentLifecycleEvent @event)
    {
        lock (_gate) _events.Add(@event);
        return Task.CompletedTask;
    }
}
