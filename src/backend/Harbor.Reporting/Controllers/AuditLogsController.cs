using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Reporting.Data;
using Harbor.Reporting.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Npgsql;

namespace Harbor.Reporting.Controllers;

[ApiController]
[Route("api/reporting/audit")]
[Route("api/reports/audit")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class AuditLogsController(
    ReportingDbConnectionFactory dbFactory,
    ILogger<AuditLogsController> logger) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(List<AuditLogDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuditLogs([FromQuery] int limit = 100)
    {
        try
        {
            await using var connection = dbFactory.CreateConnection();
            await connection.OpenAsync();

            const string sql = @"
                SELECT 
                    ""Id""::text AS ""Id"",
                    ""Timestamp"",
                    ""Actor"",
                    ""Action"",
                    ""Target"",
                    ""IpAddress"",
                    ""Severity"",
                    ""Details""
                FROM ""AuditLogs""
                ORDER BY ""Timestamp"" DESC
                LIMIT @limit;";

            await using var command = new NpgsqlCommand(sql, connection);
            command.Parameters.AddWithValue("@limit", Math.Min(Math.Max(limit, 1), 500));

            var logs = new List<AuditLogDto>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                logs.Add(new AuditLogDto
                {
                    Id = reader.GetString(0),
                    Timestamp = reader.GetDateTime(1),
                    Actor = reader.GetString(2),
                    Action = reader.GetString(3),
                    Target = reader.GetString(4),
                    IpAddress = reader.GetString(5),
                    Severity = reader.GetString(6),
                    Details = reader.IsDBNull(7) ? null : reader.GetString(7)
                });
            }

            return Ok(logs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to fetch audit logs");
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to fetch audit logs" });
        }
    }
}
