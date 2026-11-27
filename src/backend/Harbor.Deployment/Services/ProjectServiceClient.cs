using System.Text.Json;

namespace Harbor.Deployment.Services;

public interface IProjectServiceClient
{
    Task<ProjectServiceDetails?> GetServiceDetailsAsync(string serviceId);
}

public sealed class ProjectServiceDetails
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public int? OwnerId { get; set; }
    public bool IsArchived { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? RepositoryUrl { get; set; }
    public string? RepositoryName { get; set; }
    public string? RepositoryBranch { get; set; }
    public string? WorkflowFile { get; set; }
    public string? Provider { get; set; }
    public string? ProviderToken { get; set; }
}

public sealed class ProjectServiceClient(HttpClient httpClient, ILogger<ProjectServiceClient> logger) : IProjectServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<ProjectServiceDetails?> GetServiceDetailsAsync(string serviceId)
    {
        try
        {
            var response = await httpClient.GetAsync($"/api/internal/services/{Uri.EscapeDataString(serviceId)}");
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
            logger.LogError(ex, "Failed to fetch service details for {ServiceId} from Harbor.Project", serviceId);
            return null;
        }
    }

    private sealed class ApiWrapper
    {
        public ProjectServiceDetails? Data { get; set; }
    }
}
