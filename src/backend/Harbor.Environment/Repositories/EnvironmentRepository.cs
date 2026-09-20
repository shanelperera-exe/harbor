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

        command.CommandText = "INSERT INTO \"Environments\" (\"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\") " +
                              "VALUES (@publicId, @projectId, @name, @type, @createdAt, TRUE) RETURNING \"Id\";";

        command.Parameters.AddWithValue("publicId", environment.PublicId);
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

        command.CommandText = "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\", \"DeactivatedAt\", \"DeploymentUrl\", \"Provider\" FROM \"Environments\" " +
                              "WHERE \"ProjectId\" = @projectId AND \"IsActive\" = TRUE ORDER BY \"CreatedAt\";";

        command.Parameters.AddWithValue("projectId", projectId);

        var environments = new List<EnvironmentEntity>();

        await using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            environments.Add(new EnvironmentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ProjectId = reader.GetInt32(2),
                Name = reader.GetString(3),
                Type = reader.GetString(4),
                CreatedAt = reader.GetDateTime(5),
                IsActive = reader.GetBoolean(6),
                DeactivatedAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                DeploymentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
                Provider = reader.IsDBNull(9) ? null : reader.GetString(9)
            });
        }

        return environments;
    }

    public async Task<EnvironmentEntity?> GetByIdAsync(int environmentId, int projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();

        command.CommandText = "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"CreatedAt\", \"IsActive\", \"DeactivatedAt\", \"DeploymentUrl\", \"Provider\" " +
                              "FROM \"Environments\" WHERE \"Id\" = @environmentId AND \"ProjectId\" = @projectId;";

        command.Parameters.AddWithValue("environmentId", environmentId);
        command.Parameters.AddWithValue("projectId", projectId);

        await using var reader = await command.ExecuteReaderAsync();

        return await reader.ReadAsync()
            ? new EnvironmentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ProjectId = reader.GetInt32(2),
                Name = reader.GetString(3),
                Type = reader.GetString(4),
                CreatedAt = reader.GetDateTime(5),
                IsActive = reader.GetBoolean(6),
                DeactivatedAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                DeploymentUrl = reader.IsDBNull(8) ? null : reader.GetString(8),
                Provider = reader.IsDBNull(9) ? null : reader.GetString(9)
            }
            : null;
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

        command.CommandText = """
            SELECT
                to_regclass('"Deployments"') IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'Deployments'
                      AND column_name = 'ProjectId'
                ),
                to_regclass('"Deployments"') IS NOT NULL
                AND to_regclass('"Services"') IS NOT NULL
                AND EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = 'Deployments'
                      AND column_name = 'ServiceId'
                );
            """;

        await using var schemaReader = await command.ExecuteReaderAsync();
        if (!await schemaReader.ReadAsync())
            return false;

        var hasLegacyProjectId = schemaReader.GetBoolean(0);
        var hasServiceId = schemaReader.GetBoolean(1);
        await schemaReader.CloseAsync();

        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);

        command.CommandText = hasServiceId
            ? """
              SELECT EXISTS (
                  SELECT 1
                  FROM "Deployments" d
                  JOIN "Services" s ON s."Id" = d."ServiceId"
                  WHERE s."ProjectId" = @projectId
                    AND d."Environment" = @environmentName
              );
              """
            : hasLegacyProjectId
                ? """
                  SELECT EXISTS (
                      SELECT 1
                      FROM "Deployments"
                      WHERE "ProjectId" = @projectId
                        AND "Environment" = @environmentName
                  );
                  """
                : null;

        if (command.CommandText is null)
            return false;

        return Convert.ToBoolean(await command.ExecuteScalarAsync());
    }

    public async Task<(bool Exists, int Id, int OwnerId, bool IsArchived)> GetProjectAccessAsync(string projectId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();

        if (int.TryParse(projectId, out var parsedId))
        {
            command.CommandText = "SELECT \"Id\", \"OwnerId\", \"IsArchived\" FROM \"Projects\" WHERE \"Id\" = @id OR \"PublicId\" = @publicId;";
            command.Parameters.AddWithValue("id", parsedId);
        }
        else
        {
            command.CommandText = "SELECT \"Id\", \"OwnerId\", \"IsArchived\" FROM \"Projects\" WHERE \"PublicId\" = @publicId;";
        }
        
        command.Parameters.AddWithValue("publicId", projectId);

        await using var reader = await command.ExecuteReaderAsync();

        return await reader.ReadAsync()
            ? (true, reader.GetInt32(0), reader.GetInt32(1), reader.GetBoolean(2))
            : (false, 0, 0, false);
    }

    public async Task<bool> TypeExistsForProjectAsync(int projectId, string type, int? excludeEnvironmentId = null)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();

        command.CommandText = "SELECT COUNT(1) FROM \"Environments\" WHERE \"ProjectId\" = @projectId AND \"Type\" = @type AND \"IsActive\" = TRUE AND (@excludeEnvironmentId IS NULL OR \"Id\" <> @excludeEnvironmentId);";

        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("type", type);
        command.Parameters.AddWithValue(
            "excludeEnvironmentId",
            NpgsqlTypes.NpgsqlDbType.Integer,
            (object?)excludeEnvironmentId ?? DBNull.Value);

        return Convert.ToInt64(await command.ExecuteScalarAsync()) > 0;
    }

    public async Task<bool> UpdateDeploymentInfoAsync(
        int environmentId,
        int projectId,
        string? deploymentUrl,
        string? provider)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();

        command.CommandText = "UPDATE \"Environments\" SET \"DeploymentUrl\" = @deploymentUrl, \"Provider\" = @provider " +
                              "WHERE \"Id\" = @environmentId AND \"ProjectId\" = @projectId AND \"IsActive\" = TRUE;";

        command.Parameters.AddWithValue("environmentId", environmentId);
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue(
            "deploymentUrl",
            (object?)deploymentUrl ?? DBNull.Value);
        command.Parameters.AddWithValue(
            "provider",
            (object?)provider ?? DBNull.Value);

        return await command.ExecuteNonQueryAsync() > 0;
    }
}