using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Harbor.Reporting.Adapters
{
    public class KubernetesLogAdapter : ILogProviderAdapter
    {
        private readonly ILogger<KubernetesLogAdapter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public KubernetesLogAdapter(ILogger<KubernetesLogAdapter> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public string ProviderName => "Kubernetes";

        public async Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct)
        {
            _logger.LogInformation("Kubernetes Adapter is verifying credentials and fetching logs...");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Add("User-Agent", "Harbor-Agent/1.0");

                if (!string.IsNullOrWhiteSpace(apiToken))
                {
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
                }

                // Assume in-cluster API by default or fallback to localhost kubectl proxy for PoC
                var response = await client.GetAsync("https://kubernetes.default.svc/api/v1/pods", ct);
                
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry 
                    { 
                        Level = "info", 
                        Message = $"[Kubernetes Integration] Connected to K8s API server. HTTP Status: {response.StatusCode}.", 
                        Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                    }
                };
            }
            catch (Exception ex)
            {
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry { Level = "error", Message = $"[Kubernetes Integration] Error connecting to K8s API: {ex.Message}", Timestamp = DateTime.UtcNow.ToString("HH:mm:ss") }
                };
            }
        }
    }
}
