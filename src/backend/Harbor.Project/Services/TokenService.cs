using System.Text.Json;

namespace Harbor.Project.Services
{
    public interface ITokenService
    {
        Task<string?> GetGitHubTokenAsync(int userId);
    }

    public class TokenService : ITokenService
    {
        private readonly HttpClient _httpClient;
        private readonly string _authServiceUrl;

        public TokenService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _authServiceUrl = configuration["AuthServiceUrl"] ?? "http://authentication-service:8080"; // Assuming docker network name
        }

        public async Task<string?> GetGitHubTokenAsync(int userId)
        {
            var response = await _httpClient.GetAsync($"{_authServiceUrl}/api/internal/users/{userId}/tokens/github");
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
    }
}
