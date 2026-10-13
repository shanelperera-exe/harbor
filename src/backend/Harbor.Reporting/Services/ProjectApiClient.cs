using System;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Harbor.Reporting.Services
{
    public interface IProjectApiClient
    {
        Task<ServiceDetailsDto?> GetServiceDetailsAsync(string serviceId);
    }

    public class ProjectApiClient : IProjectApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ProjectApiClient> _logger;

        public ProjectApiClient(HttpClient httpClient, ILogger<ProjectApiClient> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
            // Assumes project-service is reachable at this internal URL
            _httpClient.BaseAddress = new Uri(Environment.GetEnvironmentVariable("PROJECT_SERVICE_URL") ?? "http://project-service:8080");
        }

        public async Task<ServiceDetailsDto?> GetServiceDetailsAsync(string serviceId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"/api/internal/services/{serviceId}");
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to fetch service details for {ServiceId}. Status: {Status}", serviceId, response.StatusCode);
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                var apiResponse = JsonSerializer.Deserialize<ApiResponse<ServiceDetailsDto>>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                return apiResponse?.Data;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching service details for {ServiceId}", serviceId);
                return null;
            }
        }
    }

    public class ApiResponse<T>
    {
        public T? Data { get; set; }
    }

    public class ServiceDetailsDto
    {
        public string? Provider { get; set; }
        public string? ProviderToken { get; set; }
    }
}
