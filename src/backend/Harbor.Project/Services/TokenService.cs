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
    /// Distinguishes "this user has not connected GitHub" from "Harbor tried and GitHub refused",
    /// so the controller can report the real reason instead of a generic "not connected".
    /// </summary>
    public sealed class GitHubTokenResult
    {
        public string? Token { get; init; }
        public bool HasToken => !string.IsNullOrWhiteSpace(Token);

        /// <summary>True only when the user genuinely has no installation to use.</summary>
        public bool IsNotConnected { get; init; }

        /// <summary>Human-readable reason the token could not be obtained, for logs and API responses.</summary>
        public string? FailureReason { get; init; }

        public static GitHubTokenResult Success(string token) => new() { Token = token };

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
                            return GitHubTokenResult.Success(token);
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
