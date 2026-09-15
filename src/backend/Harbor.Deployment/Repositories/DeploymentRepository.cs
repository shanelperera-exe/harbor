using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Npgsql;

namespace Harbor.Deployment.Repositories;

public class DeploymentRepository(DbConnectionFactory dbFactory) : IDeploymentRepository
{
    public async Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int? projectId, string? status, int skip, int take)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        var whereClauses = new List<string> { "\"OwnerId\" = @ownerId" };
        if (projectId.HasValue)
        {
            whereClauses.Add("\"ProjectId\" = @projectId");
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            whereClauses.Add("LOWER(\"Status\") = LOWER(@status)");
        }
        var filter = "WHERE " + string.Join(" AND ", whereClauses);

        await using var count = connection.CreateCommand();
        count.CommandText = $"SELECT COUNT(1) FROM \"Deployments\" {filter}";
        AddFilters(count, ownerId, projectId, status);
        var total = Convert.ToInt32(await count.ExecuteScalarAsync());

        await using var command = connection.CreateCommand();
        command.CommandText = $"SELECT \"Id\", \"ProjectId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\" FROM \"Deployments\" {filter} ORDER BY \"StartedAt\" DESC, \"Id\" DESC OFFSET @skip LIMIT @take";
        AddFilters(command, ownerId, projectId, status);
        command.Parameters.AddWithValue("skip", skip);
        command.Parameters.AddWithValue("take", take);
        return (await ReadDeploymentsAsync(command), total);
    }

    public async Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"ProjectId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\" FROM \"Deployments\" WHERE \"Id\" = @id AND \"OwnerId\" = @ownerId";
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
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO \"Deployments\" (\"ProjectId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\") VALUES (@projectId, @ownerId, @environment, @version, @commitSha, @status, @startedAt) RETURNING \"Id\";";
        command.Parameters.AddWithValue("projectId", deployment.ProjectId);
        command.Parameters.AddWithValue("ownerId", deployment.OwnerId);
        command.Parameters.AddWithValue("environment", deployment.Environment);
        command.Parameters.AddWithValue("version", deployment.Version);
        command.Parameters.AddWithValue("commitSha", (object?)deployment.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("status", deployment.Status);
        command.Parameters.AddWithValue("startedAt", deployment.StartedAt);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<(bool Exists, int OwnerId, bool IsArchived)> GetProjectAccessAsync(int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"OwnerId\", \"IsArchived\" FROM \"Projects\" WHERE \"Id\" = @projectId;";
        command.Parameters.AddWithValue("projectId", projectId);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (true, reader.GetInt32(0), reader.GetBoolean(1))
            : (false, 0, false);
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

    private static void AddFilters(NpgsqlCommand command, int ownerId, int? projectId, string? status)
    {
        command.Parameters.AddWithValue("ownerId", ownerId);
        if (projectId.HasValue)
        {
            command.Parameters.AddWithValue("projectId", projectId.Value);
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
        while (await reader.ReadAsync()) result.Add(new DeploymentEntity { Id = reader.GetInt32(0), ProjectId = reader.GetInt32(1), OwnerId = reader.GetInt32(2), Environment = reader.GetString(3), Version = reader.GetString(4), CommitSha = reader.IsDBNull(5) ? null : reader.GetString(5), Status = reader.GetString(6), StartedAt = reader.GetDateTime(7), CompletedAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8), FailureReason = reader.IsDBNull(9) ? null : reader.GetString(9) });
        return result;
    }
}
