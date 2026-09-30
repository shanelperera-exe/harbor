using System.Net;
using System.Text.Json;

namespace Harbor.Project.Services
{
    public interface ITokenService
    {
        Task<string?> GetGitHubTokenAsync(int userId);
        Task<GitHubInstallationToken?> GetGitHubInstallationTokenAsync(int userId);
        Task<GitHubTokenResult> GetGitHubTokenResultAsync(int userId);
    }

    /// <summary>
    /// Which credential the returned token came from. Installation tokens are minted by the GitHub
    /// App and are the intended path; the user OAuth token is a fallback for when the App private
    /// key is unusable, and it carries that user's own scopes instead of the installation's.
    /// </summary>
    public enum GitHubTokenSource
    {
        None = 0,
        Installation,
        UserOAuth
    }

    /// <summary>
    /// Distinguishes "this user has not connected GitHub" from "Harbor tried and GitHub refused",
    /// so the controller can report the real reason instead of a generic "not connected".
    /// </summary>
    public sealed record GitHubTokenResult
    {
        public string? Token { get; init; }
        public bool HasToken => !string.IsNullOrWhiteSpace(Token);

        /// <summary>True only when the user genuinely has no installation to use.</summary>
        public bool IsNotConnected { get; init; }

        /// <summary>Which credential produced <see cref="Token"/>.</summary>
        public GitHubTokenSource Source { get; init; } = GitHubTokenSource.None;

        /// <summary>Why the installation token was unavailable, when the OAuth fallback was used.</summary>
        public string? InstallationTokenFailure { get; init; }

        /// <summary>Human-readable reason the token could not be obtained, for logs and API responses.</summary>
        public string? FailureReason { get; init; }

        public static GitHubTokenResult Success(string token, GitHubTokenSource source) =>
            new() { Token = token, Source = source };

        public static GitHubTokenResult NotConnected(string reason) =>
            new() { IsNotConnected = true, FailureReason = reason };

        public static GitHubTokenResult Failed(string reason) =>
            new() { FailureReason = reason };
    }

    public sealed class GitHubInstallationToken
    {
        public string Token { get; init; } = string.Empty;
        public DateTimeOffset ExpiresAt { get; init; }
    }

    public class TokenService : ITokenService
    {
        private readonly HttpClient _httpClient;
        private readonly string _authServiceUrl;

        public TokenService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _authServiceUrl = configuration["AuthServiceUrl"] ?? "http://authentication-service:8080";
        }

        public async Task<string?> GetGitHubTokenAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"{_authServiceUrl}/api/internal/users/{userId}/installation-token");
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            if (document.RootElement.TryGetProperty("token", out var tokenElement))
            {
                return tokenElement.GetString();
            }

            return null;
        }

        public async Task<GitHubTokenResult> GetGitHubTokenResultAsync(int userId)
        {
            var installation = await GetInstallationTokenResultAsync(userId);
            if (installation.HasToken)
            {
                return installation;
            }

            // The App private key can be missing, stale, or paired with the wrong App, and all three
            // look identical from here. The user's own OAuth token does not depend on that key, so
            // fall back to it and keep the repository list working.
            var oauth = await GetUserOAuthTokenResultAsync(userId);
            if (oauth.HasToken)
            {
                return new GitHubTokenResult
                {
                    Token = oauth.Token,
                    Source = GitHubTokenSource.UserOAuth,
                    InstallationTokenFailure = installation.FailureReason,
                    FailureReason = oauth.FailureReason
                };
            }

            // Report the installation failure when there is any chance the App is simply misconfigured,
            // because that is the actionable cause; the OAuth error is secondary.
            return installation.IsNotConnected && !oauth.HasToken
                ? installation
                : installation with
                {
                    FailureReason =
                        $"{installation.FailureReason} Falling back to the account's GitHub OAuth token also failed: {oauth.FailureReason}"
                };
        }

        private async Task<GitHubTokenResult> GetInstallationTokenResultAsync(int userId)
        {
            var url = $"{_authServiceUrl}/api/internal/users/{userId}/installation-token";

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.GetAsync(url);
            }
            catch (Exception ex)
            {
                return GitHubTokenResult.Failed(
                    $"Could not reach the authentication service at {_authServiceUrl}: {ex.Message}");
            }

            using (response)
            {
                var body = await response.Content.ReadAsStringAsync();

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    return GitHubTokenResult.NotConnected(
                        "No GitHub App installation is recorded for this account. Install the GitHub App and retry.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    // Harbor.Authentication answers 500 when GitHub rejects the App JWT, which is
                    // what a missing or mismatched GH_APP_PRIVATE_KEY_BASE64 looks like. Passing the
                    // upstream body through is the only way to tell that apart from other failures.
                    return GitHubTokenResult.Failed(
                        $"The authentication service returned {(int)response.StatusCode} {response.ReasonPhrase} " +
                        $"for the installation token: {Summarize(body)}");
                }

                try
                {
                    using var document = JsonDocument.Parse(body);
                    if (document.RootElement.TryGetProperty("token", out var tokenElement))
                    {
                        var token = tokenElement.GetString();
                        if (!string.IsNullOrWhiteSpace(token))
                            return GitHubTokenResult.Success(token, GitHubTokenSource.Installation);
                    }
                }
                catch (JsonException ex)
                {
                    return GitHubTokenResult.Failed(
                        $"The authentication service returned a malformed installation token response: {ex.Message}");
                }

                return GitHubTokenResult.Failed(
                    "The authentication service returned a successful response without a token field.");
            }
        }

        /// <summary>
        /// Fetches the GitHub OAuth token stored for the user at login. This credential is
        /// independent of the GitHub App private key, so it keeps repository access working when
        /// the App cannot mint installation tokens.
        /// </summary>
        private async Task<GitHubTokenResult> GetUserOAuthTokenResultAsync(int userId)
        {
            var url = $"{_authServiceUrl}/api/internal/users/{userId}/tokens/github";

            HttpResponseMessage response;
            try
            {
                response = await _httpClient.GetAsync(url);
            }
            catch (Exception ex)
            {
                return GitHubTokenResult.Failed(
                    $"Could not reach the authentication service at {_authServiceUrl}: {ex.Message}");
            }

            using (response)
            {
                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    return GitHubTokenResult.NotConnected(
                        "No GitHub account is linked to this Harbor account. Sign in with GitHub and retry.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    return GitHubTokenResult.Failed(
                        $"The authentication service returned {(int)response.StatusCode} " +
                        $"{response.ReasonPhrase} for the stored GitHub OAuth token.");
                }

                var body = await response.Content.ReadAsStringAsync();
                try
                {
                    using var document = JsonDocument.Parse(body);
                    if (document.RootElement.TryGetProperty("token", out var tokenElement))
                    {
                        var token = tokenElement.GetString();
                        if (!string.IsNullOrWhiteSpace(token))
                            return GitHubTokenResult.Success(token, GitHubTokenSource.UserOAuth);
                    }
                }
                catch (JsonException ex)
                {
                    return GitHubTokenResult.Failed(
                        $"The authentication service returned a malformed OAuth token response: {ex.Message}");
                }

                return GitHubTokenResult.Failed(
                    "The authentication service returned a successful response without an OAuth token field.");
            }
        }

        private static string Summarize(string? body)
        {
            if (string.IsNullOrWhiteSpace(body)) return "(empty body)";
            var single = body.Trim();
            return single.Length <= 400 ? single : single[..400] + "...";
        }

        public async Task<GitHubInstallationToken?> GetGitHubInstallationTokenAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"{_authServiceUrl}/api/internal/users/{userId}/installation-token");
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            if (document.RootElement.TryGetProperty("token", out var tokenElement))
            {
                var expiresAt = document.RootElement.TryGetProperty("expiresAt", out var expElement)
                    ? expElement.GetDateTime()
                    : DateTimeOffset.UtcNow.AddMinutes(55);

                return new GitHubInstallationToken
                {
                    Token = tokenElement.GetString() ?? string.Empty,
                    ExpiresAt = expiresAt
                };
            }

            return null;
        }
    }
}
