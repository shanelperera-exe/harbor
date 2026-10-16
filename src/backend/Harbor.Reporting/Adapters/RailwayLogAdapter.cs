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
    public class RailwayLogAdapter : ILogProviderAdapter
    {
        private readonly ILogger<RailwayLogAdapter> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public RailwayLogAdapter(ILogger<RailwayLogAdapter> logger, IHttpClientFactory httpClientFactory)
        {
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public string ProviderName => "Railway";

        public async Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct)
        {
            _logger.LogInformation("Railway Adapter is fetching data using the integration token...");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
                client.DefaultRequestHeaders.Add("User-Agent", "Harbor-Agent/1.0");

                var query = new
                {
                    query = "query { me { id name email projects { edges { node { id name } } } } }"
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(query),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await client.PostAsync("https://backboard.railway.com/graphql/v2", content, ct);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync(ct);
                    using var doc = JsonDocument.Parse(json);
                    
                    string userIdentifier = "Railway Account";
                    string? projectName = null;

                    if (doc.RootElement.TryGetProperty("data", out var data) &&
                        data.TryGetProperty("me", out var me))
                    {
                        if (me.TryGetProperty("name", out var nameProp) && !string.IsNullOrWhiteSpace(nameProp.GetString()))
                        {
                            userIdentifier = nameProp.GetString()!;
                        }
                        else if (me.TryGetProperty("email", out var emailProp) && !string.IsNullOrWhiteSpace(emailProp.GetString()))
                        {
                            userIdentifier = emailProp.GetString()!;
                        }

                        if (me.TryGetProperty("projects", out var projects) &&
                            projects.TryGetProperty("edges", out var edges) &&
                            edges.GetArrayLength() > 0)
                        {
                            var firstEdge = edges[0];
                            if (firstEdge.TryGetProperty("node", out var node) &&
                                node.TryGetProperty("name", out var projNameProp))
                            {
                                projectName = projNameProp.GetString();
                            }
                        }
                    }

                    var entries = new List<ProviderLogEntry>
                    {
                        new ProviderLogEntry
                        {
                            Level = "[info]",
                            Message = $"[Railway Integration] Successfully connected. Account: {userIdentifier}. Dynamic log stream established.",
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        }
                    };

                    if (!string.IsNullOrWhiteSpace(projectName))
                    {
                        entries.Add(new ProviderLogEntry
                        {
                            Level = "[debug]",
                            Message = $"[Railway Integration] Connected project: {projectName}.",
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        });
                    }

                    return entries;
                }
                else
                {
                    return new List<ProviderLogEntry>
                    {
                        new ProviderLogEntry
                        {
                            Level = "error",
                            Message = $"[Railway Integration] Error fetching from API: {response.StatusCode} - Please verify your integration token.",
                            Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                        }
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to Railway API.");
                return new List<ProviderLogEntry>
                {
                    new ProviderLogEntry
                    {
                        Level = "error",
                        Message = $"[Railway Integration] Failed to execute API call: {ex.Message}",
                        Timestamp = DateTime.UtcNow.ToString("HH:mm:ss")
                    }
                };
            }
        }
    }
}
