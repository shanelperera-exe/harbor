using Harbor.Deployment.Data;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

[ApiController]
[Route("api/internal/deployments")]
public sealed class InternalDeploymentsController(DbConnectionFactory dbFactory) : ControllerBase
{
    [HttpGet("history")]
    public async Task<IActionResult> HasHistory([FromQuery] int projectId, [FromQuery] string environmentName)
    {
        if (projectId <= 0 || string.IsNullOrWhiteSpace(environmentName))
        {
            return Ok(new { hasHistory = false });
        }

        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM "Deployments" d
                LEFT JOIN "ServiceCatalogCache" sc ON sc."ServiceId" = d."ServiceId"
                WHERE COALESCE(d."ProjectId", sc."ProjectId") = @projectId
                  AND d."Environment" = @environmentName
            );
            """;
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);

        var hasHistory = Convert.ToBoolean(await command.ExecuteScalarAsync());
        return Ok(new { hasHistory });
    }
}
