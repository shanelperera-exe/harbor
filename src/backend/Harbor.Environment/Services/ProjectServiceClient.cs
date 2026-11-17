using System.Text.Json;

namespace Harbor.Environment.Services;

public interface IProjectServiceClient
{
    Task<(bool Exists, int Id, int OwnerId, bool IsArchived)> GetProjectAccessAsync(string projectId);
}

public sealed class ProjectServiceClient(HttpClient httpClient, ILogger<ProjectServiceClient> logger) : IProjectServiceClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<(bool Exists, int Id, int OwnerId, bool IsArchived)> GetProjectAccessAsync(string projectId)
    {
        try
        {
            var response = await httpClient.GetAsync($"/api/internal/projects/{Uri.EscapeDataString(projectId)}/access");
            if (!response.IsSuccessStatusCode)
            {
                return (false, 0, 0, false);
            }

            var json = await response.Content.ReadAsStringAsync();
            var dto = JsonSerializer.Deserialize<ProjectAccessDto>(json, JsonOptions);
            return dto is null
                ? (false, 0, 0, false)
                : (dto.Exists, dto.Id, dto.OwnerId, dto.IsArchived);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to query project access for {ProjectId} from Harbor.Project", projectId);
            return (false, 0, 0, false);
        }
    }

    private sealed class ProjectAccessDto
    {
        public bool Exists { get; set; }
        public int Id { get; set; }
        public int OwnerId { get; set; }
        public bool IsArchived { get; set; }
    }
}
