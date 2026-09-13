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
        command.CommandText = "INSERT INTO \"Environments\" (\"ProjectId\", \"Name\", \"Type\", \"CreatedAt\") " +
                              "VALUES (@projectId, @name, @type, @createdAt) RETURNING \"Id\";";
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
        command.CommandText = "SELECT \"Id\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\" FROM \"Environments\" " +
                              "WHERE \"ProjectId\" = @projectId ORDER BY \"CreatedAt\";";
        command.Parameters.AddWithValue("projectId", projectId);
        var environments = new List<EnvironmentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            environments.Add(new EnvironmentEntity { Id = reader.GetInt32(0), ProjectId = reader.GetInt32(1),
                Name = reader.GetString(2), Type = reader.GetString(3), CreatedAt = reader.GetDateTime(4) });
        }
        return environments;
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

    public async Task<bool> TypeExistsForProjectAsync(int projectId, string type)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(1) FROM \"Environments\" WHERE \"ProjectId\" = @projectId AND \"Type\" = @type;";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("type", type);
        return Convert.ToInt64(await command.ExecuteScalarAsync()) > 0;
    }
}
