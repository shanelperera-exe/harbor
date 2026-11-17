using System.Text.Json;

namespace Harbor.Environment.Services;

public interface IDeploymentServiceClient
{
    Task<bool> HasDeploymentHistoryAsync(int projectId, string environmentName);
}

public sealed class DeploymentServiceClient(HttpClient httpClient, ILogger<DeploymentServiceClient> logger) : IDeploymentServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<bool> HasDeploymentHistoryAsync(int projectId, string environmentName)
    {
        try
        {
            var url = $"/api/internal/deployments/history?projectId={projectId}&environmentName={Uri.EscapeDataString(environmentName)}";
            var response = await httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return false;
            }

            var json = await response.Content.ReadAsStringAsync();
            var dto = JsonSerializer.Deserialize<DeploymentHistoryResponse>(json, JsonOptions);
            return dto?.HasHistory ?? false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to query deployment history for project {ProjectId}, env {EnvironmentName}", projectId, environmentName);
            return false;
        }
    }

    private sealed class DeploymentHistoryResponse
    {
        public bool HasHistory { get; set; }
    }
}
