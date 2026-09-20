using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Npgsql;

namespace Harbor.Deployment.Repositories;

public class DeploymentRepository(DbConnectionFactory dbFactory) : IDeploymentRepository
{
    public async Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, string? serviceId, string? status, int skip, int take)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        var whereClauses = new List<string> { "\"OwnerId\" = @ownerId" };
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            whereClauses.Add("""
                EXISTS (
                    SELECT 1
                    FROM "Services" s
                    WHERE s."Id" = "Deployments"."ServiceId"
                      AND (s."PublicId" = @serviceId OR s."Id"::text = @serviceId)
                )
                """);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            whereClauses.Add("LOWER(\"Status\") = LOWER(@status)");
        }
        var filter = "WHERE " + string.Join(" AND ", whereClauses);

        await using var count = connection.CreateCommand();
        count.CommandText = $"SELECT COUNT(1) FROM \"Deployments\" {filter}";
        AddFilters(count, ownerId, serviceId, status);
        var total = Convert.ToInt32(await count.ExecuteScalarAsync());

        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT \"Id\", \"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\" FROM \"Deployments\" {filter} ORDER BY \"StartedAt\" DESC, \"Id\" DESC OFFSET @skip LIMIT @take";
        AddFilters(command, ownerId, serviceId, status);
        command.Parameters.AddWithValue("skip", skip);
        command.Parameters.AddWithValue("take", take);
        return (await ReadDeploymentsAsync(command), total);
    }

    public async Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\" FROM \"Deployments\" WHERE \"Id\" = @id AND \"OwnerId\" = @ownerId";
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("ownerId", ownerId);
        return (await ReadDeploymentsAsync(command)).SingleOrDefault();
    }

    public async Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"DeploymentId\", \"Timestamp\", \"Level\", \"Message\" FROM \"DeploymentLogs\" WHERE \"DeploymentId\" = @deploymentId ORDER BY \"Timestamp\", \"Id\"";
        command.Parameters.AddWithValue("deploymentId", deploymentId);
        var result = new List<DeploymentLogEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(new DeploymentLogEntity { Id = reader.GetInt32(0), DeploymentId = reader.GetInt32(1), Timestamp = reader.GetDateTime(2), Level = reader.GetString(3), Message = reader.GetString(4) });
        return result;
    }

    public async Task<int> CreateAsync(DeploymentEntity deployment)
    {
        var publicId = string.IsNullOrEmpty(deployment.PublicId) ? Harbor.Common.Utilities.IdGenerator.DeploymentId() : deployment.PublicId;
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO \"Deployments\" (\"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\") VALUES (@publicId, @serviceId, @ownerId, @environment, @version, @commitSha, @status, @startedAt) RETURNING \"Id\";";
        command.Parameters.AddWithValue("publicId", publicId);
        command.Parameters.AddWithValue("serviceId", deployment.ServiceId);
        command.Parameters.AddWithValue("ownerId", deployment.OwnerId);
        command.Parameters.AddWithValue("environment", deployment.Environment);
        command.Parameters.AddWithValue("version", deployment.Version);
        command.Parameters.AddWithValue("commitSha", (object?)deployment.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("status", deployment.Status);
        command.Parameters.AddWithValue("startedAt", deployment.StartedAt);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId, int RealServiceId)> GetServiceAccessAsync(string serviceIdOrPublicId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        if (int.TryParse(serviceIdOrPublicId, out var serviceId))
        {
            command.CommandText = "SELECT p.\"OwnerId\", p.\"IsArchived\", s.\"ProjectId\", s.\"Id\" FROM \"Services\" s JOIN \"Projects\" p ON s.\"ProjectId\" = p.\"Id\" WHERE s.\"Id\" = @serviceId OR s.\"PublicId\" = @publicId;";
            command.Parameters.AddWithValue("serviceId", serviceId);
            command.Parameters.AddWithValue("publicId", serviceIdOrPublicId);
        }
        else
        {
            command.CommandText = "SELECT p.\"OwnerId\", p.\"IsArchived\", s.\"ProjectId\", s.\"Id\" FROM \"Services\" s JOIN \"Projects\" p ON s.\"ProjectId\" = p.\"Id\" WHERE s.\"PublicId\" = @publicId;";
            command.Parameters.AddWithValue("publicId", serviceIdOrPublicId);
        }

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (true, reader.GetInt32(0), reader.GetBoolean(1), reader.GetInt32(2), reader.GetInt32(3))
            : (false, 0, false, 0, 0);
    }

    public async Task<(bool Exists, bool IsActive, string Type)?> GetEnvironmentByNameAsync(int projectId, string environmentName)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"IsActive\", \"Type\" FROM \"Environments\" WHERE \"ProjectId\" = @projectId AND \"Name\" = @environmentName;";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (true, reader.GetBoolean(0), reader.GetString(1))
            : null;
    }

    private static void AddFilters(NpgsqlCommand command, int ownerId, string? serviceId, string? status)
    {
        command.Parameters.AddWithValue("ownerId", ownerId);
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            command.Parameters.AddWithValue("serviceId", serviceId);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            command.Parameters.AddWithValue("status", status);
        }
    }

    private static async Task<List<DeploymentEntity>> ReadDeploymentsAsync(NpgsqlCommand command)
    {
        var result = new List<DeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(new DeploymentEntity { Id = reader.GetInt32(0), PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1), ServiceId = reader.GetInt32(2), OwnerId = reader.GetInt32(3), Environment = reader.GetString(4), Version = reader.GetString(5), CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6), Status = reader.GetString(7), StartedAt = reader.GetDateTime(8), CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9), FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10) });
        return result;
    }
}
