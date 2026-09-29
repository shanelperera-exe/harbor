using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public sealed record InstallationToken(string Token, DateTimeOffset ExpiresAt);

public sealed class GitHubAppInstallationProvider(
    HttpClient httpClient,
    IGitHubAppJwtProvider jwtProvider,
    IOptions<GitHubAppOptions> options,
    IMemoryCache cache,
    ILogger<GitHubAppInstallationProvider> logger) : IGitHubAppInstallationProvider
{
    private readonly GitHubAppOptions _options = options.Value;
    private readonly TimeSpan _cacheTtl = TimeSpan.FromMinutes(45);

    public async Task<InstallationToken> GetInstallationTokenAsync(long installationId, CancellationToken ct = default)
    {
        var cacheKey = $"github-install-token:{_options.AppId}:{installationId}";
        if (cache.TryGetValue<InstallationToken>(cacheKey, out var cached) && cached.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(5))
            return cached;

        var jwt = jwtProvider.GenerateAppJwt();

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            $"app/installations/{installationId}/access_tokens");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var detail = await response.Content.ReadAsStringAsync(ct);
            logger.LogWarning("GitHub installation token request failed ({Status}): {Detail}", response.StatusCode, detail);
            throw new InvalidOperationException($"Failed to create GitHub installation token for installation {installationId}: {response.StatusCode}");
        }

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        var token = body.GetProperty("token").GetString()!;
        var expiresAt = body.GetProperty("expires_at").GetDateTime();
        var result = new InstallationToken(token, new DateTimeOffset(expiresAt, TimeSpan.Zero));

        cache.Set(cacheKey, result, _cacheTtl);
        return result;
    }

    public async Task<IReadOnlyList<long>> GetUserInstallationsAsync(string userAccessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "user/installations");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("GitHub user installations request failed ({Status})", response.StatusCode);
            return Array.Empty<long>();
        }

        var body = await response.Content.ReadFromJsonAsync<GithubInstallationsResponse>(cancellationToken: ct);
        return body?.Installations.Select(i => i.Id).ToArray() ?? Array.Empty<long>();
    }

    public async Task<IReadOnlyList<GitHubInstallation>> GetUserInstallationsDetailAsync(string userAccessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "user/installations");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return Array.Empty<GitHubInstallation>();

        var body = await response.Content.ReadFromJsonAsync<GithubInstallationsResponse>(cancellationToken: ct);
        return body?.Installations
               .Select(i => new GitHubInstallation(i.Id, i.Account?.Login ?? string.Empty, i.Account?.Type ?? string.Empty, null))
               .ToArray() ?? Array.Empty<GitHubInstallation>();
    }

    public async Task<long?> ResolveInstallationForRepoAsync(string owner, string repo, string userAccessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"repos/{Uri.EscapeDataString(owner)}/{Uri.EscapeDataString(repo)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Cannot access repository {owner}/{repo}: {response.StatusCode}");

        var body = await response.Content.ReadFromJsonAsync<RepoResponse>(cancellationToken: ct);
        if (body == null || body.Owner == null)
            throw new InvalidOperationException("Empty repository response from GitHub.");

        var account = body.Owner.Login;

        var installations = await GetUserInstallationsDetailAsync(userAccessToken, ct);
        var match = installations.FirstOrDefault(i =>
            string.Equals(i.AccountLogin, account, StringComparison.OrdinalIgnoreCase));

        return match.InstallationId != 0 ? match.InstallationId : null;
    }

    private sealed class GithubInstallationsResponse
    {
        [JsonPropertyName("total_count")]
        public int TotalCount { get; set; }

        [JsonPropertyName("installations")]
        public List<GithubInstallationResponse> Installations { get; set; } = new();
    }

    private sealed class GithubInstallationResponse
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("account")]
        public GithubAccountResponse? Account { get; set; }
    }

    private sealed class GithubAccountResponse
    {
        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("html_url")]
        public string? HtmlUrl { get; set; }
    }

    private sealed class RepoResponse
    {
        [JsonPropertyName("owner")]
        public RepoOwner? Owner { get; set; }
    }

    private sealed class RepoOwner
    {
        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;
    }
}

public sealed record GitHubInstallation(long InstallationId, string AccountLogin, string AccountType, string? HtmlUrl);
