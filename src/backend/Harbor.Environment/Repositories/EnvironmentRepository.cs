using Harbor.Environment.Data;
using Harbor.Environment.Models;

namespace Harbor.Environment.Repositories;

public class EnvironmentRepository(DbConnectionFactory dbFactory) : IEnvironmentRepository
{
    public async Task<int> CreateAsync(EnvironmentEntity environment)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO \"Environments\" (\"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\") " +
                              "VALUES (@projectId, @name, @type, @createdAt, TRUE) RETURNING \"Id\";";
        command.Parameters.AddWithValue("projectId", environment.ProjectId);
        command.Parameters.AddWithValue("name", environment.Name);
        command.Parameters.AddWithValue("type", environment.Type);
        command.Parameters.AddWithValue("createdAt", environment.CreatedAt);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<List<EnvironmentEntity>> GetByProjectIdAsync(int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\", \"DeactivatedAt\" FROM \"Environments\" " +
                              "WHERE \"ProjectId\" = @projectId AND \"IsActive\" = TRUE ORDER BY \"CreatedAt\";";
        command.Parameters.AddWithValue("projectId", projectId);
        var environments = new List<EnvironmentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            environments.Add(new EnvironmentEntity { Id = reader.GetInt32(0), ProjectId = reader.GetInt32(1),
                Name = reader.GetString(2), Type = reader.GetString(3), CreatedAt = reader.GetDateTime(4),
                IsActive = reader.GetBoolean(5), DeactivatedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6) });
        }
        return environments;
    }

    public async Task<EnvironmentEntity?> GetByIdAsync(int environmentId, int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\", \"DeactivatedAt\" FROM \"Environments\" WHERE \"Id\" = @environmentId AND \"ProjectId\" = @projectId;";
        command.Parameters.AddWithValue("environmentId", environmentId);
        command.Parameters.AddWithValue("projectId", projectId);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? new EnvironmentEntity
        {
            Id = reader.GetInt32(0), ProjectId = reader.GetInt32(1), Name = reader.GetString(2), Type = reader.GetString(3),
            CreatedAt = reader.GetDateTime(4), IsActive = reader.GetBoolean(5), DeactivatedAt = reader.IsDBNull(6) ? null : reader.GetDateTime(6)
        } : null;
    }

    public async Task<bool> UpdateAsync(EnvironmentEntity environment)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"Environments\" SET \"Name\" = @name, \"Type\" = @type WHERE \"Id\" = @id AND \"ProjectId\" = @projectId AND \"IsActive\" = TRUE;";
        command.Parameters.AddWithValue("id", environment.Id);
        command.Parameters.AddWithValue("projectId", environment.ProjectId);
        command.Parameters.AddWithValue("name", environment.Name);
        command.Parameters.AddWithValue("type", environment.Type);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> DeleteAsync(int environmentId, int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM \"Environments\" WHERE \"Id\" = @environmentId AND \"ProjectId\" = @projectId AND \"IsActive\" = TRUE;";
        command.Parameters.AddWithValue("environmentId", environmentId);
        command.Parameters.AddWithValue("projectId", projectId);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> DeactivateAsync(int environmentId, int projectId, DateTime deactivatedAt)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"Environments\" SET \"IsActive\" = FALSE, \"DeactivatedAt\" = @deactivatedAt WHERE \"Id\" = @environmentId AND \"ProjectId\" = @projectId AND \"IsActive\" = TRUE;";
        command.Parameters.AddWithValue("environmentId", environmentId);
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("deactivatedAt", deactivatedAt);
        return await command.ExecuteNonQueryAsync() > 0;
    }

    public async Task<bool> HasDeploymentHistoryAsync(int projectId, string environmentName)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT to_regclass('\"Deployments\"') IS NOT NULL;";
        if (!Convert.ToBoolean(await command.ExecuteScalarAsync())) return false;
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM \"Deployments\" WHERE \"ProjectId\" = @projectId AND \"Environment\" = @environmentName);";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);
        return Convert.ToBoolean(await command.ExecuteScalarAsync());
    }

    public async Task<(bool Exists, int OwnerId, bool IsArchived)> GetProjectAccessAsync(int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"OwnerId\", \"IsArchived\" FROM \"Projects\" WHERE \"Id\" = @projectId;";
        command.Parameters.AddWithValue("projectId", projectId);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() ? (true, reader.GetInt32(0), reader.GetBoolean(1)) : (false, 0, false);
    }

    public async Task<bool> TypeExistsForProjectAsync(int projectId, string type, int? excludeEnvironmentId = null)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(1) FROM \"Environments\" WHERE \"ProjectId\" = @projectId AND \"Type\" = @type AND \"IsActive\" = TRUE AND (@excludeEnvironmentId IS NULL OR \"Id\" <> @excludeEnvironmentId);";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("type", type);
        command.Parameters.AddWithValue("excludeEnvironmentId", (object?)excludeEnvironmentId ?? DBNull.Value);
        return Convert.ToInt64(await command.ExecuteScalarAsync()) > 0;
    }
}
