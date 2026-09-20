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
            if (string.IsNullOrEmpty(service.PublicId))
            {
                service.PublicId = Harbor.Common.Utilities.IdGenerator.ServiceId();
            }

            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"Services\" (\"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\") " +
                "VALUES (@publicId, @projectId, @name, @type, @repositoryUrl, @repositoryName, @repositoryBranch, @repositoryCommit, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("publicId", service.PublicId);
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
                "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                "FROM \"Services\" WHERE \"Id\" = @id";
            command.Parameters.AddWithValue("id", id);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return MapServiceEntity(reader);
            }

            return null;
        }

        public async Task<ServiceEntity?> GetByIdOrPublicIdAsync(string identifier)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            if (int.TryParse(identifier, out var id))
            {
                command.CommandText =
                    "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                    "FROM \"Services\" WHERE \"Id\" = @id OR \"PublicId\" = @identifier";
                command.Parameters.AddWithValue("id", id);
                command.Parameters.AddWithValue("identifier", identifier);
            }
            else
            {
                command.CommandText =
                    "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                    "FROM \"Services\" WHERE \"PublicId\" = @identifier";
                command.Parameters.AddWithValue("identifier", identifier);
            }

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return MapServiceEntity(reader);
            }

            return null;
        }

        public async Task<List<ServiceEntity>> GetByProjectIdAsync(int projectId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"PublicId\", \"ProjectId\", \"Name\", \"Type\", \"RepositoryUrl\", \"RepositoryName\", \"RepositoryBranch\", \"RepositoryCommit\", \"CreatedAt\" " +
                "FROM \"Services\" WHERE \"ProjectId\" = @projectId ORDER BY \"CreatedAt\" DESC";
            command.Parameters.AddWithValue("projectId", projectId);

            var services = new List<ServiceEntity>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                services.Add(MapServiceEntity(reader));
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

        private static ServiceEntity MapServiceEntity(System.Data.Common.DbDataReader reader)
        {
            return new ServiceEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ProjectId = reader.GetInt32(2),
                Name = reader.GetString(3),
                Type = reader.GetString(4),
                RepositoryUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                RepositoryName = reader.IsDBNull(6) ? null : reader.GetString(6),
                RepositoryBranch = reader.IsDBNull(7) ? null : reader.GetString(7),
                RepositoryCommit = reader.IsDBNull(8) ? null : reader.GetString(8),
                CreatedAt = reader.GetDateTime(9)
            };
        }
    }
}
