using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Harbor.Reporting.Hubs;
using Harbor.Caching;
using System.IO;

namespace Harbor.Reporting.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class WebhooksController : ControllerBase
    {
        private readonly ILogger<WebhooksController> _logger;
        private readonly IHubContext<ServiceLogsHub> _hubContext;
        private readonly ICacheService _cacheService;

        public WebhooksController(
            ILogger<WebhooksController> logger,
            IHubContext<ServiceLogsHub> hubContext,
            ICacheService cacheService)
        {
            _logger = logger;
            _hubContext = hubContext;
            _cacheService = cacheService;
        }

        [HttpPost("{provider}/{serviceId}")]
        public async Task<IActionResult> ReceiveLogDrain(string provider, string serviceId)
        {
            _logger.LogInformation("Received webhook payload from {Provider} for service {ServiceId}", provider, serviceId);

            try
            {
                using var reader = new StreamReader(Request.Body);
                var payload = await reader.ReadToEndAsync();

                if (string.IsNullOrWhiteSpace(payload))
                {
                    return BadRequest("Empty payload");
                }

                // Parse standard Vercel NDJSON (Newline Delimited JSON) or array payload
                var entries = new List<object>();

                if (provider.Equals("vercel", StringComparison.OrdinalIgnoreCase))
                {
                    // Vercel NDJSON lines
                    var lines = payload.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                    foreach (var line in lines)
                    {
                        try
                        {
                            var doc = JsonDocument.Parse(line);
                            // Vercel log drain format has 'message', 'type', 'host', 'path', 'statusCode'
                            var root = doc.RootElement;
                            
                            string message = root.TryGetProperty("message", out var msgProp) ? msgProp.GetString() : "Unknown Event";
                            string status = root.TryGetProperty("statusCode", out var statusProp) ? statusProp.GetInt32().ToString() : "---";
                            string host = root.TryGetProperty("host", out var hostProp) ? hostProp.GetString() : "vercel.app";
                            string path = root.TryGetProperty("path", out var pathProp) ? pathProp.GetString() : "/";
                            string method = root.TryGetProperty("method", out var methodProp) ? methodProp.GetString() : "GET";
                            
                            // Try to format as HTTP Access log if it looks like one
                            string formattedMessage = (root.TryGetProperty("type", out var typeProp) && typeProp.GetString() == "request") 
                                ? $"{method} {status} {host} {path}" 
                                : message;

                            var logEntry = new
                            {
                                timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                level = "[info]",
                                message = formattedMessage
                            };

                            entries.Add(logEntry);
                        }
                        catch
                        {
                            // Skip invalid lines
                        }
                    }
                }
                else if (provider.Equals("railway", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var doc = JsonDocument.Parse(payload);
                        var root = doc.RootElement;

                        if (root.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var item in root.EnumerateArray())
                            {
                                var msg = item.TryGetProperty("message", out var m) ? m.GetString() : item.ToString();
                                var lvl = item.TryGetProperty("level", out var l) ? l.GetString() : "[info]";
                                var ts = item.TryGetProperty("timestamp", out var t) ? t.GetString() : DateTime.UtcNow.ToString("HH:mm:ss.ff");

                                entries.Add(new
                                {
                                    timestamp = ts ?? DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                    level = lvl ?? "[info]",
                                    message = msg ?? "Railway log message"
                                });
                            }
                        }
                        else if (root.TryGetProperty("type", out var typeProp))
                        {
                            // Railway Project Webhook (e.g. DEPLOY_COMPLETED)
                            var eventType = typeProp.GetString() ?? "DEPLOYMENT_EVENT";
                            string status = "UNKNOWN";
                            string commitMsg = "";
                            string commitAuthor = "";

                            if (root.TryGetProperty("details", out var details))
                            {
                                if (details.TryGetProperty("status", out var s)) status = s.GetString() ?? "UNKNOWN";
                                if (details.TryGetProperty("commitMessage", out var cm)) commitMsg = cm.GetString() ?? "";
                                if (details.TryGetProperty("commitAuthor", out var ca)) commitAuthor = ca.GetString() ?? "";
                            }

                            string serviceName = "";
                            if (root.TryGetProperty("resource", out var res) &&
                                res.TryGetProperty("service", out var srv) &&
                                srv.TryGetProperty("name", out var sn))
                            {
                                serviceName = sn.GetString() ?? "";
                            }

                            var summary = $"[Railway Webhook] {eventType}: Status={status}";
                            if (!string.IsNullOrWhiteSpace(serviceName)) summary += $" | Service={serviceName}";
                            if (!string.IsNullOrWhiteSpace(commitMsg)) summary += $" | Commit: {commitMsg} ({commitAuthor})";

                            entries.Add(new
                            {
                                timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                level = status.Equals("SUCCESS", StringComparison.OrdinalIgnoreCase) ? "[success]" : (status.Equals("FAILED", StringComparison.OrdinalIgnoreCase) ? "[error]" : "[info]"),
                                message = summary
                            });
                        }
                        else if (root.TryGetProperty("message", out var singleMsg))
                        {
                            var lvl = root.TryGetProperty("level", out var l) ? l.GetString() : "[info]";
                            var ts = root.TryGetProperty("timestamp", out var t) ? t.GetString() : DateTime.UtcNow.ToString("HH:mm:ss.ff");
                            entries.Add(new
                            {
                                timestamp = ts ?? DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                level = lvl ?? "[info]",
                                message = singleMsg.GetString() ?? "Railway log"
                            });
                        }
                        else
                        {
                            entries.Add(new
                            {
                                timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                level = "[info]",
                                message = $"[Railway Webhook] Received event payload: {payload.Trim()}"
                            });
                        }
                    }
                    catch
                    {
                        var lines = payload.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                        foreach (var line in lines)
                        {
                            entries.Add(new
                            {
                                timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                                level = "[info]",
                                message = line.Trim()
                            });
                        }
                    }
                }
                else
                {
                    // Generic fallback for other PaaS providers
                    var logEntry = new
                    {
                        timestamp = DateTime.UtcNow.ToString("HH:mm:ss.ff"),
                        level = "[info]",
                        message = $"[{provider.ToUpper()} Webhook] Received unparsed payload payload."
                    };
                    entries.Add(logEntry);
                }

                // Broadcast and Cache
                foreach (var logEntry in entries)
                {
                    await _hubContext.Clients.Group($"logs_{serviceId}").SendAsync("ReceiveLog", serviceId, logEntry);

                    string cacheKey = $"logs:buffer:{serviceId}";
                    var recentLogs = await _cacheService.GetAsync<List<object>>(cacheKey) ?? new List<object>();
                    recentLogs.Add(logEntry);
                    if (recentLogs.Count > 100) recentLogs.RemoveRange(0, recentLogs.Count - 100);
                    await _cacheService.SetAsync(cacheKey, recentLogs, TimeSpan.FromHours(24));
                }

                return Ok(new { success = true, logsProcessed = entries.Count });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process webhook from {Provider}", provider);
                return StatusCode(500, "Internal Server Error while processing webhook");
            }
        }
    }
}
