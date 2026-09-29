namespace Harbor.GitHub.Services;

public interface IGitHubAppInstallationProvider
{
    Task<InstallationToken> GetInstallationTokenAsync(long installationId, CancellationToken ct = default);
    Task<IReadOnlyList<long>> GetUserInstallationsAsync(string userAccessToken, CancellationToken ct = default);
    Task<IReadOnlyList<GitHubInstallation>> GetUserInstallationsDetailAsync(string userAccessToken, CancellationToken ct = default);
    Task<long?> ResolveInstallationForRepoAsync(string owner, string repo, string userAccessToken, CancellationToken ct = default);
}
