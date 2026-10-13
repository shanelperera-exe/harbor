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
