using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Harbor.Reporting.DTOs;
using Harbor.Reporting.Hubs;
using Harbor.Caching;

namespace Harbor.Reporting.Controllers
{
    [ApiController]
    [Route("api/reporting/logs")]
    public class LogsController : ControllerBase
    {
        private readonly IHubContext<ServiceLogsHub> _hubContext;
        private readonly ICacheService _cacheService;

        public LogsController(IHubContext<ServiceLogsHub> hubContext, ICacheService cacheService)
        {
            _hubContext = hubContext;
            _cacheService = cacheService;
        }

        [HttpPost("ingest/{serviceId}")]
        public async Task<IActionResult> IngestLog(string serviceId, [FromBody] LogIngestRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var logEntry = new
            {
                timestamp = request.Timestamp ?? DateTime.UtcNow.ToString("HH:mm:ss"),
                level = $"[{request.Level.Trim('[', ']')}]",
                message = request.Message
            };

            // 1. Broadcast to any connected clients instantly
            await _hubContext.Clients.Group($"logs_{serviceId}").SendAsync("ReceiveLog", serviceId, logEntry);

            // 2. Buffer the log in Redis so late-joiners can see recent history
            string cacheKey = $"logs:buffer:{serviceId}";
            var recentLogs = await _cacheService.GetAsync<List<object>>(cacheKey) ?? new List<object>();
            
            recentLogs.Add(logEntry);
            
            // Keep only the last 100 logs to prevent memory bloat
            if (recentLogs.Count > 100)
            {
                recentLogs.RemoveRange(0, recentLogs.Count - 100);
            }

            await _cacheService.SetAsync(cacheKey, recentLogs, TimeSpan.FromHours(24));

            return Ok(new { success = true });
        }
    }
}
