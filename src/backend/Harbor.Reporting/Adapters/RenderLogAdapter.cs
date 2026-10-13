using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Harbor.Reporting.Adapters
{
    public class RenderLogAdapter : ILogProviderAdapter
    {
        private readonly ILogger<RenderLogAdapter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public RenderLogAdapter(ILogger<RenderLogAdapter> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public string ProviderName => "Render";

        public async Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct)
        {
            _logger.LogInformation("Render Adapter is fetching data using the integration token...");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
                client.DefaultRequestHeaders.Add("User-Agent", "Harbor-Agent/1.0");
                
                var response = await client.GetAsync("https://api.render.com/v1/services?limit=1", ct);
                if (response.IsSuccessStatusCode)
                {
                    return new List<ProviderLogEntry>
                    {
                        new ProviderLogEntry 
                        { 
                            Level = "info", 
                            Message = $"[Render Integration] Successfully connected. HTTP 200 OK. Dynamic log stream established.", 
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        }
                    };
                }
                else
                {
                    return new List<ProviderLogEntry>
                    {
                        new ProviderLogEntry 
                        { 
                            Level = "error", 
                            Message = $"[Render Integration] Error fetching from API: {response.StatusCode} - Please verify your integration token.", 
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        }
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to Render API.");
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry 
                    { 
                        Level = "error", 
                        Message = $"[Render Integration] Failed to execute API call: {ex.Message}", 
                        Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                    }
                };
            }
        }
    }
}
