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
    public static class SharedVercelState 
    {
        public static bool IsConnected { get; set; } = false;
    }

    public class VercelLogAdapter : ILogProviderAdapter
    {
        private readonly ILogger<VercelLogAdapter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public VercelLogAdapter(ILogger<VercelLogAdapter> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public string ProviderName => "Vercel";

        public async Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct)
        {
            _logger.LogInformation("Vercel Adapter is fetching deployments using the integration token...");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
                
                var response = await client.GetAsync("https://api.vercel.com/v6/deployments?limit=1", ct);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync(ct);
                    var doc = JsonDocument.Parse(json);
                    
                    var deployments = doc.RootElement.GetProperty("deployments");
                    if (deployments.GetArrayLength() > 0)
                    {
                        var latest = deployments[0];
                        var name = latest.GetProperty("name").GetString();
                        var state = latest.GetProperty("state").GetString();
                        var url = latest.GetProperty("url").GetString();
                        var id = latest.GetProperty("uid").GetString();

                        var target = latest.TryGetProperty("target", out var targetProp) && targetProp.ValueKind != JsonValueKind.Null ? targetProp.GetString() : "production";
                        
                        var entries = new List<ProviderLogEntry>
                        {
                            new ProviderLogEntry 
                            { 
                                Level = state == "READY" ? "[success]" : "[info]", 
                                Message = $"[Vercel Sync] Active {target?.ToUpper() ?? "PRODUCTION"} deployment: {name} (State: {state})", 
                                Timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff")
                            },
                            new ProviderLogEntry
                            {
                                Level = "[debug]",
                                Message = $"[Vercel Network] Routing traffic to edge node: https://{url}",
                                Timestamp = DateTime.UtcNow.AddMilliseconds(10).ToString("HH:mm:ss.ff")
                            }
                        };
                        return entries;
                    }
                    else
                    {
                        return new List<ProviderLogEntry>
                        {
                            new ProviderLogEntry 
                            { 
                                Level = "warn", 
                                Message = $"[Vercel Integration] Connected, but no deployments found on Vercel.", 
                                Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                            }
                        };
                    }
                }
                else
                {
                    return new List<ProviderLogEntry>
                    {
                        new ProviderLogEntry 
                        { 
                            Level = "error", 
                            Message = $"[Vercel Integration] Error fetching from Vercel API: {response.StatusCode} - Please verify your integration token.", 
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        }
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to Vercel API.");
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry 
                    { 
                        Level = "error", 
                        Message = $"[Vercel Integration] Failed to execute API call: {ex.Message}", 
                        Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                    }
                };
            }
        }
    }
}
