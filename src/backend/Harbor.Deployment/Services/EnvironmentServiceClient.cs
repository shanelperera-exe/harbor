using System.Text.Json;

namespace Harbor.Deployment.Services;

public interface IEnvironmentServiceClient
{
    Task<EnvironmentSummary?> GetEnvironmentByNameAsync(int projectId, string environmentName);
}

public sealed class EnvironmentSummary
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public string? DeploymentUrl { get; set; }
}

public sealed class EnvironmentServiceClient(HttpClient httpClient, ILogger<EnvironmentServiceClient> logger) : IEnvironmentServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<EnvironmentSummary?> GetEnvironmentByNameAsync(int projectId, string environmentName)
    {
        try
        {
            var response = await httpClient.GetAsync(
                $"/api/internal/projects/{projectId}/environments/{Uri.EscapeDataString(environmentName)}");
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync();
            var wrapper = JsonSerializer.Deserialize<ApiWrapper>(json, JsonOptions);
            return wrapper?.Data;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch environment {EnvironmentName} for project {ProjectId} from Harbor.Environment", environmentName, projectId);
            return null;
        }
    }

    private sealed class ApiWrapper
    {
        public EnvironmentSummary? Data { get; set; }
    }
}
