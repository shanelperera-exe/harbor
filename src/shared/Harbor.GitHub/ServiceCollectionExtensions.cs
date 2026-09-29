using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Harbor.GitHub.Services;

namespace Harbor.GitHub;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddHarborGitHubApp(this IServiceCollection services)
    {
        services.AddOptions();
        services.AddSingleton<IConfigureOptions<GitHubAppOptions>, GitHubAppOptionsSetup>();

        services.AddMemoryCache();

        var apiBaseUrl = Environment.GetEnvironmentVariable("GITHUB_API_BASE_URL") ?? "https://api.github.com/";
        var oauthBaseUrl = GitHubAppOAuthClient.DeriveOAuthBaseUrl(apiBaseUrl);

        services.AddHttpClient<IGitHubAppApiClient, GitHubAppApiClient>(client =>
        {
            client.BaseAddress = new Uri(apiBaseUrl);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        });

        services.AddHttpClient<IGitHubAppOAuthClient, GitHubAppOAuthClient>(client =>
        {
            client.BaseAddress = new Uri(oauthBaseUrl);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor");
        });

        services.AddHttpClient<IGitHubAppInstallationProvider, GitHubAppInstallationProvider>(client =>
        {
            client.BaseAddress = new Uri(apiBaseUrl);
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor");
            client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        });

        services.AddSingleton<IGitHubAppJwtProvider, GitHubAppJwtProvider>();

        return services;
    }
}
