using Harbor.Deployment.Services;
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
