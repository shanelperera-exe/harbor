using Harbor.Reporting.Data;
using Harbor.Reporting.Models;
using Npgsql;

namespace Harbor.Reporting.Repositories;

/// <summary>
/// Reads deployment data for the reporting feature (US-22).
///
/// All WHERE clauses are assembled from a fixed list of predicate strings whose values
/// are bound through named <see cref="NpgsqlParameter"/> objects — never via string
/// interpolation of user-supplied data. This satisfies the "parameterized SQL" requirement
/// in the US-22 acceptance criteria and prevents SQL-injection.
/// </summary>
public class DeploymentReportRepository(ReportingDbConnectionFactory dbFactory) : IDeploymentReportRepository
{
    private static readonly string[] SuccessStatuses = ["succeeded", "ready"];
    private static readonly string[] FailureStatuses = ["failed", "error"];

    public async Task<IReadOnlyList<DeploymentReportEntity>> GetReportRowsAsync(
        int userId,
        bool isAdmin,
        string? projectId,
        string? environment,
        string? status,
        DateTime? startDate,
        DateTime? endDate)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        // ── Build WHERE predicates ─────────────────────────────────────────────
        // Each predicate is a fixed SQL fragment; user values only appear as @param references.
        var predicates = new List<string>
        {
            // Ownership guard – admins see everything; regular users see only their projects.
            "(@isAdmin OR p.\"OwnerId\" = @userId)"
        };

        if (!string.IsNullOrWhiteSpace(projectId))
            predicates.Add("p.\"Id\"::text = @projectId");

        if (!string.IsNullOrWhiteSpace(environment))
            predicates.Add("LOWER(d.\"Environment\") = LOWER(@environment)");

        if (!string.IsNullOrWhiteSpace(status))
            predicates.Add("LOWER(d.\"Status\") = LOWER(@status)");

        if (startDate.HasValue)
            predicates.Add("d.\"StartedAt\" >= @startDate");

        if (endDate.HasValue)
            // Include deployments that started on the end date (end of day).
            predicates.Add("d.\"StartedAt\" < @endDate");

        var whereClause = "WHERE " + string.Join(" AND ", predicates);

        // ── Build the query ────────────────────────────────────────────────────
        await using var command = connection.CreateCommand();
        command.CommandText = $@"
            SELECT
                d.""Id"",
                d.""PublicId"",
                d.""Environment"",
                d.""Version"",
                d.""CommitSha"",
                d.""CommitMessage"",
                d.""Status"",
                d.""StartedAt"",
                d.""CompletedAt"",
                d.""FailureReason"",
                p.""Name""   AS ""ProjectName"",
                s.""Name""   AS ""ServiceName"",
                u.""Username"" AS ""UserName""
            FROM ""Deployments"" d
            JOIN ""Services""  s ON d.""ServiceId""  = s.""Id""
            JOIN ""Projects""  p ON s.""ProjectId""  = p.""Id""
            LEFT JOIN ""Users"" u ON d.""OwnerId""    = u.""Id""
            {whereClause}
            ORDER BY d.""StartedAt"" DESC, d.""Id"" DESC";

        // ── Bind parameters ────────────────────────────────────────────────────
        command.Parameters.AddWithValue("userId",  userId);
        command.Parameters.AddWithValue("isAdmin", isAdmin);

        if (!string.IsNullOrWhiteSpace(projectId))
            command.Parameters.AddWithValue("projectId", projectId);

        if (!string.IsNullOrWhiteSpace(environment))
            command.Parameters.AddWithValue("environment", environment);

        if (!string.IsNullOrWhiteSpace(status))
            command.Parameters.AddWithValue("status", status);

        if (startDate.HasValue)
            command.Parameters.AddWithValue("startDate", startDate.Value.ToUniversalTime());

        if (endDate.HasValue)
            // Add one day so "endDate = Oct 9" includes all of Oct 9.
            command.Parameters.AddWithValue("endDate", endDate.Value.ToUniversalTime().AddDays(1));

        // ── Read results ───────────────────────────────────────────────────────
        var results = new List<DeploymentReportEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            results.Add(new DeploymentReportEntity
            {
                Id            = reader.GetInt32(0),
                PublicId      = reader.IsDBNull(1)  ? string.Empty : reader.GetString(1),
                Environment   = reader.IsDBNull(2)  ? string.Empty : reader.GetString(2),
                Version       = reader.IsDBNull(3)  ? string.Empty : reader.GetString(3),
                CommitSha     = reader.IsDBNull(4)  ? null : reader.GetString(4),
                CommitMessage = reader.IsDBNull(5)  ? null : reader.GetString(5),
                Status        = reader.IsDBNull(6)  ? string.Empty : reader.GetString(6),
                StartedAt     = reader.GetDateTime(7),
                CompletedAt   = reader.IsDBNull(8)  ? null : reader.GetDateTime(8),
                FailureReason = reader.IsDBNull(9)  ? null : reader.GetString(9),
                ProjectName   = reader.IsDBNull(10) ? null : reader.GetString(10),
                ServiceName   = reader.IsDBNull(11) ? null : reader.GetString(11),
                UserName      = reader.IsDBNull(12) ? null : reader.GetString(12),
            });
        }

        return results;
    }
}
