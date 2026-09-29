using System.Text.Json;

namespace Harbor.Project.Services
{
    public interface ITokenService
    {
        Task<string?> GetGitHubTokenAsync(int userId);
        Task<GitHubInstallationToken?> GetGitHubInstallationTokenAsync(int userId);
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
