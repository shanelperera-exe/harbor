using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Harbor.Reporting.Adapters
{
    public class DockerLogAdapter : ILogProviderAdapter
    {
        private readonly ILogger<DockerLogAdapter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public DockerLogAdapter(ILogger<DockerLogAdapter> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public string ProviderName => "Docker";

        public async Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct)
        {
            _logger.LogInformation("Docker Adapter is verifying connection and fetching logs...");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Harbor-Agent/1.0");

                // If apiToken is provided, assume it's a Docker Daemon REST API URL (e.g. http://host.docker.internal:2375)
                string dockerApiUrl = string.IsNullOrWhiteSpace(apiToken) ? "http://localhost:2375" : apiToken.TrimEnd('/');
                
                var response = await client.GetAsync($"{dockerApiUrl}/v1.41/containers/json", ct);
                
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry 
                    { 
                        Level = "info", 
                        Message = $"[Docker Integration] Connected to Docker daemon at {dockerApiUrl}. HTTP Status: {response.StatusCode}.", 
                        Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                    }
                };
            }
            catch (Exception ex)
            {
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry { Level = "error", Message = $"[Docker Integration] Error connecting to Docker engine: {ex.Message}", Timestamp = DateTime.UtcNow.ToString("HH:mm:ss") }
                };
            }
        }
    }
}
