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

        // ── Build the query ────────────────────────────────────────────────────
        await using var command = connection.CreateCommand();
        command.CommandText = @"
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
            WHERE (@isAdmin = TRUE OR p.""OwnerId"" = @userId)
              AND (CAST(@projectId AS text) IS NULL OR p.""Id""::text = @projectId)
              AND (CAST(@environment AS text) IS NULL OR LOWER(d.""Environment"") = LOWER(@environment))
              AND (CAST(@status AS text) IS NULL OR LOWER(d.""Status"") = LOWER(@status))
              AND (CAST(@startDate AS timestamp with time zone) IS NULL OR d.""StartedAt"" >= @startDate)
              AND (CAST(@endDate AS timestamp with time zone) IS NULL OR d.""StartedAt"" < @endDate)
            ORDER BY d.""StartedAt"" DESC, d.""Id"" DESC";

        // ── Bind parameters ────────────────────────────────────────────────────
        command.Parameters.Add(new NpgsqlParameter("userId", NpgsqlTypes.NpgsqlDbType.Integer) { Value = userId });
        command.Parameters.Add(new NpgsqlParameter("isAdmin", NpgsqlTypes.NpgsqlDbType.Boolean) { Value = isAdmin });
        command.Parameters.Add(new NpgsqlParameter("projectId", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)projectId ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("environment", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)environment ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("status", NpgsqlTypes.NpgsqlDbType.Text) { Value = (object?)status ?? DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("startDate", NpgsqlTypes.NpgsqlDbType.TimestampTz) { Value = startDate.HasValue ? (object)DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc) : DBNull.Value });
        command.Parameters.Add(new NpgsqlParameter("endDate", NpgsqlTypes.NpgsqlDbType.TimestampTz) { Value = endDate.HasValue ? (object)DateTime.SpecifyKind(endDate.Value, DateTimeKind.Utc).AddDays(1) : DBNull.Value });

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
