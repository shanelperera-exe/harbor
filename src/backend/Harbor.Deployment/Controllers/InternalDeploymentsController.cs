using Harbor.Deployment.Data;
using Harbor.Deployment.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

[ApiController]
[Route("api/internal/deployments")]
public sealed class InternalDeploymentsController(
    DbConnectionFactory dbFactory,
    IDeploymentRepository? deploymentRepository = null) : ControllerBase
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

    [HttpGet("report-rows")]
    public async Task<IActionResult> GetReportRows(
        [FromQuery] int userId,
        [FromQuery] bool isAdmin = false,
        [FromQuery] string? projectId = null,
        [FromQuery] string? environment = null,
        [FromQuery] string? status = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        if (deploymentRepository is null)
            return Ok(Array.Empty<object>());

        var (items, _) = await deploymentRepository.GetHistoryAsync(
            userId,
            projectId: null, // filter after hydration so ProjectId works even when cache is empty
            environment: environment,
            serviceId: null,
            status: status,
            skip: 0,
            take: 500,
            isAdmin: isAdmin);

        var filtered = items.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(projectId))
        {
            var matchedIds = new HashSet<int>();
            foreach (var item in items)
            {
                var access = await deploymentRepository.GetServiceAccessAsync(item.ServiceId.ToString());
                if (access.Exists && access.ProjectId.ToString() == projectId)
                    matchedIds.Add(item.Id);
            }
            filtered = filtered.Where(i => matchedIds.Contains(i.Id));
        }

        if (startDate.HasValue)
        {
            var startUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            filtered = filtered.Where(i => i.StartedAt >= startUtc);
        }

        if (endDate.HasValue)
        {
            var endUtc = DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc).AddDays(1);
            filtered = filtered.Where(i => i.StartedAt < endUtc);
        }

        var rows = filtered.Select(d => new
        {
            d.Id,
            d.PublicId,
            d.Environment,
            d.Version,
            d.CommitSha,
            d.CommitMessage,
            d.Status,
            d.StartedAt,
            d.CompletedAt,
            d.FailureReason,
            d.ProjectName,
            d.ServiceName,
            d.UserName
        }).ToList();

        return Ok(rows);
    }
}
