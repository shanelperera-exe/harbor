using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public sealed class GitHubAppOptionsSetup : IConfigureOptions<GitHubAppOptions>
{
    public void Configure(GitHubAppOptions options)
    {
        options.AppId = long.TryParse(Environment.GetEnvironmentVariable("GH_APP_ID") ?? Environment.GetEnvironmentVariable("GITHUB_APP_ID"), out var id) ? id : 0;
        options.ClientId = Environment.GetEnvironmentVariable("GH_APP_CLIENT_ID") ?? Environment.GetEnvironmentVariable("GITHUB_APP_CLIENT_ID") ?? string.Empty;
        options.ClientSecret = Environment.GetEnvironmentVariable("GH_APP_CLIENT_SECRET") ?? Environment.GetEnvironmentVariable("GITHUB_APP_CLIENT_SECRET") ?? string.Empty;
        options.PrivateKeyBase64 = Environment.GetEnvironmentVariable("GH_APP_PRIVATE_KEY_BASE64") ?? Environment.GetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY_BASE64") ?? string.Empty;
        options.Slug = Environment.GetEnvironmentVariable("GH_APP_SLUG") ?? Environment.GetEnvironmentVariable("GITHUB_APP_SLUG") ?? string.Empty;
        options.WebhookSecret = Environment.GetEnvironmentVariable("GH_APP_WEBHOOK_SECRET") ?? Environment.GetEnvironmentVariable("GITHUB_APP_WEBHOOK_SECRET") ?? string.Empty;
        options.ApiBaseUrl = Environment.GetEnvironmentVariable("GH_API_BASE_URL") ?? Environment.GetEnvironmentVariable("GITHUB_API_BASE_URL") ?? "https://api.github.com/";
    }
}
