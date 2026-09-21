using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Services;

public interface IInstallationTokenResolver
{
    Task<string?> GetInstallationTokenAsync(int userId);
}

public sealed class InstallationTokenResolver(HttpClient httpClient, IOptions<GitHubActionsOptions> options) : IInstallationTokenResolver
{
    private readonly string _authServiceUrl = options.Value.AuthServiceClientUrl ?? "http://authentication-service:8080";

    public async Task<string?> GetInstallationTokenAsync(int userId)
    {
        using var response = await httpClient.GetAsync($"{_authServiceUrl}/api/internal/users/{userId}/installation-token");
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(content);
        if (document.RootElement.TryGetProperty("token", out var tokenElement))
            return tokenElement.GetString();

        return null;
    }
}
