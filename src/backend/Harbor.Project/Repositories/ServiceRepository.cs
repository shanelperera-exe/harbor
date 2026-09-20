using Harbor.Project.Data;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public class ServiceRepository : IServiceRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public ServiceRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<int> CreateAsync(ServiceEntity service)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"Services\" (\"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\") " +
                "VALUES (@projectId, @name, @type, @repositoryUrl, @repositoryName, @repositoryBranch, @repositoryCommit, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("projectId", service.ProjectId);
            command.Parameters.AddWithValue("name", service.Name);
            command.Parameters.AddWithValue("type", service.Type);
            command.Parameters.AddWithValue("repositoryUrl", service.RepositoryUrl ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("repositoryName", service.RepositoryName ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("repositoryBranch", service.RepositoryBranch ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("repositoryCommit", service.RepositoryCommit ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("createdAt", DateTime.UtcNow);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<ServiceEntity?> GetByIdAsync(int id)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                "FROM \"Services\" WHERE \"Id\" = @id";
            command.Parameters.AddWithValue("id", id);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new ServiceEntity
                {
                    Id = reader.GetInt32(0),
                    ProjectId = reader.GetInt32(1),
                    Name = reader.GetString(2),
                    Type = reader.GetString(3),
                    RepositoryUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                    RepositoryName = reader.IsDBNull(5) ? null : reader.GetString(5),
                    RepositoryBranch = reader.IsDBNull(6) ? null : reader.GetString(6),
                    RepositoryCommit = reader.IsDBNull(7) ? null : reader.GetString(7),
                    CreatedAt = reader.GetDateTime(8)
                };
            }

            return null;
        }

        public async Task<List<ServiceEntity>> GetByProjectIdAsync(int projectId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                "FROM \"Services\" WHERE \"ProjectId\" = @projectId ORDER BY \"CreatedAt\" DESC";
            command.Parameters.AddWithValue("projectId", projectId);

            var services = new List<ServiceEntity>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                services.Add(new ServiceEntity
                {
                    Id = reader.GetInt32(0),
                    ProjectId = reader.GetInt32(1),
                    Name = reader.GetString(2),
                    Type = reader.GetString(3),
                    RepositoryUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                    RepositoryName = reader.IsDBNull(5) ? null : reader.GetString(5),
                    RepositoryBranch = reader.IsDBNull(6) ? null : reader.GetString(6),
                    RepositoryCommit = reader.IsDBNull(7) ? null : reader.GetString(7),
                    CreatedAt = reader.GetDateTime(8)
                });
            }

            return services;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM \"Services\" WHERE \"Id\" = @id";
            command.Parameters.AddWithValue("id", id);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
    }
}
