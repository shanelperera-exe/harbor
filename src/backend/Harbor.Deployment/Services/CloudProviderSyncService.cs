using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Harbor.Common.Security;
using Microsoft.Extensions.Logging;

namespace Harbor.Deployment.Services;

public interface ICloudProviderSyncService
{
    Task<string?> FetchLiveDeploymentUrlAsync(string provider, string token, string? commitSha, CancellationToken ct = default);
}

public class CloudProviderSyncService : ICloudProviderSyncService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IHarborSecretProtector _secretProtector;
    private readonly ILogger<CloudProviderSyncService> _logger;

    public CloudProviderSyncService(
        IHttpClientFactory httpClientFactory,
        IHarborSecretProtector secretProtector,
        ILogger<CloudProviderSyncService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _secretProtector = secretProtector;
        _logger = logger;
    }

    public async Task<string?> FetchLiveDeploymentUrlAsync(string provider, string token, string? commitSha, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(provider) || string.IsNullOrWhiteSpace(token))
            return null;

        string plainToken;
        try
        {
            plainToken = _secretProtector.Unprotect(token);
        }
        catch
        {
            plainToken = token;
        }

        var providerLower = provider.Trim().ToLowerInvariant();
        if (providerLower == "vercel")
        {
            return await FetchVercelDeploymentUrlAsync(plainToken, commitSha, ct);
        }
        else if (providerLower == "render")
        {
            return await FetchRenderDeploymentUrlAsync(plainToken, ct);
        }

        return null;
    }

    private async Task<string?> FetchVercelDeploymentUrlAsync(string apiToken, string? commitSha, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
            var response = await client.GetAsync("https://api.vercel.com/v6/deployments?limit=10", ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Vercel deployment query returned status code {StatusCode}", response.StatusCode);
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            if (!doc.RootElement.TryGetProperty("deployments", out var deployments) || deployments.GetArrayLength() == 0)
                return null;

            JsonElement targetDeployment = default;
            bool found = false;

            if (!string.IsNullOrWhiteSpace(commitSha))
            {
                foreach (var d in deployments.EnumerateArray())
                {
                    if (d.TryGetProperty("meta", out var meta) &&
                        meta.TryGetProperty("githubCommitSha", out var shaProp) &&
                        string.Equals(shaProp.GetString(), commitSha, StringComparison.OrdinalIgnoreCase))
                    {
                        targetDeployment = d;
                        found = true;
                        break;
                    }
                }
            }

            if (!found)
            {
                targetDeployment = deployments[0];
            }

            if (targetDeployment.TryGetProperty("url", out var urlProp) && !string.IsNullOrWhiteSpace(urlProp.GetString()))
            {
                var url = urlProp.GetString()!.Trim();
                return url.StartsWith("http") ? url : $"https://{url}";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching deployment URL from Vercel API");
        }

        return null;
    }

    private async Task<string?> FetchRenderDeploymentUrlAsync(string apiToken, CancellationToken ct)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
            var response = await client.GetAsync("https://api.render.com/v1/services?limit=10", ct);
            if (!response.IsSuccessStatusCode)
                return null;

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array && doc.RootElement.GetArrayLength() > 0)
            {
                var first = doc.RootElement[0];
                if (first.TryGetProperty("serviceDetails", out var details) &&
                    details.TryGetProperty("url", out var urlProp) &&
                    !string.IsNullOrWhiteSpace(urlProp.GetString()))
                {
                    var url = urlProp.GetString()!.Trim();
                    return url.StartsWith("http") ? url : $"https://{url}";
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching deployment URL from Render API");
        }

        return null;
    }
}
