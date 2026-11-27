using System.Text.Json;
using Harbor.Reporting.Models;

namespace Harbor.Reporting.Services;

public interface IDeploymentReportFallbackClient
{
    Task<IReadOnlyList<DeploymentReportEntity>> GetReportRowsAsync(
        int userId,
        bool isAdmin,
        string? projectId,
        string? environment,
        string? status,
        DateTime? startDate,
        DateTime? endDate);
}

public sealed class DeploymentReportFallbackClient(
    HttpClient httpClient,
    ILogger<DeploymentReportFallbackClient> logger) : IDeploymentReportFallbackClient
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public async Task<IReadOnlyList<DeploymentReportEntity>> GetReportRowsAsync(
        int userId,
        bool isAdmin,
        string? projectId,
        string? environment,
        string? status,
        DateTime? startDate,
        DateTime? endDate)
    {
        try
        {
            var query = new List<string>
            {
                $"userId={userId}",
                $"isAdmin={isAdmin.ToString().ToLowerInvariant()}"
            };
            if (!string.IsNullOrWhiteSpace(projectId)) query.Add($"projectId={Uri.EscapeDataString(projectId)}");
            if (!string.IsNullOrWhiteSpace(environment)) query.Add($"environment={Uri.EscapeDataString(environment)}");
            if (!string.IsNullOrWhiteSpace(status)) query.Add($"status={Uri.EscapeDataString(status)}");
            if (startDate.HasValue) query.Add($"startDate={Uri.EscapeDataString(startDate.Value.ToString("O"))}");
            if (endDate.HasValue) query.Add($"endDate={Uri.EscapeDataString(endDate.Value.ToString("O"))}");

            var response = await httpClient.GetAsync($"/api/internal/deployments/report-rows?{string.Join("&", query)}");
            if (!response.IsSuccessStatusCode)
                return Array.Empty<DeploymentReportEntity>();

            var json = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<List<DeploymentReportEntity>>(json, JsonOptions)
                   ?? [];
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to fetch fallback report rows from Harbor.Deployment");
            return Array.Empty<DeploymentReportEntity>();
        }
    }
}
