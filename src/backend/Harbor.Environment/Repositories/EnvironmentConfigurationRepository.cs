using Harbor.Environment.Data;
using Harbor.Environment.Models;

namespace Harbor.Environment.Repositories;

public class EnvironmentConfigurationRepository(DbConnectionFactory dbFactory) : IEnvironmentConfigurationRepository
{
    public async Task<List<EnvironmentConfigurationEntity>> GetByEnvironmentIdAsync(int environmentId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"EnvironmentId\", \"Key\", \"Value\", \"IsSecret\", \"CreatedAt\", \"UpdatedAt\" " +
                              "FROM \"EnvironmentConfigurations\" WHERE \"EnvironmentId\" = @environmentId ORDER BY \"Key\";";
        command.Parameters.AddWithValue("environmentId", environmentId);

        var items = new List<EnvironmentConfigurationEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            items.Add(new EnvironmentConfigurationEntity
            {
                Id = reader.GetInt32(0), EnvironmentId = reader.GetInt32(1), Key = reader.GetString(2),
                Value = reader.GetString(3), IsSecret = reader.GetBoolean(4),
                CreatedAt = reader.GetDateTime(5), UpdatedAt = reader.GetDateTime(6)
            });
        }
        return items;
    }

    public async Task ReplaceAllAsync(int environmentId, List<EnvironmentConfigurationEntity> items)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            await using (var deleteCommand = connection.CreateCommand())
            {
                deleteCommand.Transaction = (Npgsql.NpgsqlTransaction)transaction;
                deleteCommand.CommandText = "DELETE FROM \"EnvironmentConfigurations\" WHERE \"EnvironmentId\" = @environmentId;";
                deleteCommand.Parameters.AddWithValue("environmentId", environmentId);
                await deleteCommand.ExecuteNonQueryAsync();
            }

            foreach (var item in items)
            {
                await using var insertCommand = connection.CreateCommand();
                insertCommand.Transaction = (Npgsql.NpgsqlTransaction)transaction;
                insertCommand.CommandText =
                    "INSERT INTO \"EnvironmentConfigurations\" (\"EnvironmentId\", \"Key\", \"Value\", \"IsSecret\", \"CreatedAt\", \"UpdatedAt\") " +
                    "VALUES (@environmentId, @key, @value, @isSecret, @createdAt, @updatedAt);";
                insertCommand.Parameters.AddWithValue("environmentId", environmentId);
                insertCommand.Parameters.AddWithValue("key", item.Key);
                insertCommand.Parameters.AddWithValue("value", item.Value);
                insertCommand.Parameters.AddWithValue("isSecret", item.IsSecret);
                insertCommand.Parameters.AddWithValue("createdAt", item.CreatedAt);
                insertCommand.Parameters.AddWithValue("updatedAt", item.UpdatedAt);
                await insertCommand.ExecuteNonQueryAsync();
            }

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}