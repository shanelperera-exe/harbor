using Harbor.Project.Data;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public class ProjectRepository : IProjectRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public ProjectRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<int> CreateAsync(ProjectEntity project)
        {
            if (string.IsNullOrEmpty(project.PublicId))
            {
                project.PublicId = Harbor.Common.Utilities.IdGenerator.ProjectId();
            }

            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"Projects\" (\"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\") " +
                "VALUES (@publicId, @name, @description, @ownerId, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("publicId", project.PublicId);
            command.Parameters.AddWithValue("name", project.Name);
            command.Parameters.AddWithValue("description", project.Description ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("ownerId", project.OwnerId);
            command.Parameters.AddWithValue("createdAt", DateTime.UtcNow);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<bool> NameExistsForOwnerAsync(string name, int ownerId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT COUNT(1) FROM \"Projects\" WHERE \"OwnerId\" = @ownerId AND LOWER(\"Name\") = LOWER(@name)";
            command.Parameters.AddWithValue("ownerId", ownerId);
            command.Parameters.AddWithValue("name", name);

            var count = (long)(await command.ExecuteScalarAsync() ?? 0L);
            return count > 0;
        }

        public async Task<ProjectEntity?> GetByIdAsync(int id)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\", " +
                "\"IsArchived\", \"ArchivedAt\", \"UpdatedAt\" " +
                "FROM \"Projects\" WHERE \"Id\" = @id";
            command.Parameters.AddWithValue("id", id);

            var projects = await ReadProjectsAsync(command);
            return projects.FirstOrDefault();
        }

        public async Task<ProjectEntity?> GetByIdOrPublicIdAsync(string identifier)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            if (int.TryParse(identifier, out var id))
            {
                command.CommandText =
                    "SELECT \"Id\", \"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\", " +
                    "\"IsArchived\", \"ArchivedAt\", \"UpdatedAt\" " +
                    "FROM \"Projects\" WHERE \"Id\" = @id OR \"PublicId\" = @identifier";
                command.Parameters.AddWithValue("id", id);
                command.Parameters.AddWithValue("identifier", identifier);
            }
            else
            {
                command.CommandText =
                    "SELECT \"Id\", \"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\", " +
                    "\"IsArchived\", \"ArchivedAt\", \"UpdatedAt\" " +
                    "FROM \"Projects\" WHERE \"PublicId\" = @identifier";
                command.Parameters.AddWithValue("identifier", identifier);
            }

            var projects = await ReadProjectsAsync(command);
            return projects.FirstOrDefault();
        }

        public async Task<List<ProjectEntity>> GetByOwnerAsync(int ownerId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\", " +
                "\"IsArchived\", \"ArchivedAt\", \"UpdatedAt\" " +
                "FROM \"Projects\" WHERE \"OwnerId\" = @ownerId AND \"IsArchived\" = FALSE ORDER BY \"CreatedAt\" DESC";
            command.Parameters.AddWithValue("ownerId", ownerId);

            return await ReadProjectsAsync(command);
        }

        public async Task<List<ProjectEntity>> GetAllAsync()
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"PublicId\", \"Name\", \"Description\", \"OwnerId\", \"CreatedAt\", " +
                "\"IsArchived\", \"ArchivedAt\", \"UpdatedAt\" " +
                "FROM \"Projects\" WHERE \"IsArchived\" = FALSE ORDER BY \"CreatedAt\" DESC";

            return await ReadProjectsAsync(command);
        }

        public async Task<bool> UpdateAsync(ProjectEntity project)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "UPDATE \"Projects\" SET \"Name\" = @name, \"Description\" = @description, " +
                "\"UpdatedAt\" = @updatedAt " +
                "WHERE \"Id\" = @id AND \"IsArchived\" = FALSE";
            command.Parameters.AddWithValue("name", project.Name);
            command.Parameters.AddWithValue("description", project.Description ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("updatedAt", DateTime.UtcNow);
            command.Parameters.AddWithValue("id", project.Id);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }

        public async Task<bool> ArchiveAsync(int id, DateTime archivedAt)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "UPDATE \"Projects\" SET \"IsArchived\" = TRUE, \"ArchivedAt\" = @archivedAt " +
                "WHERE \"Id\" = @id AND \"IsArchived\" = FALSE";
            command.Parameters.AddWithValue("archivedAt", archivedAt);
            command.Parameters.AddWithValue("id", id);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }

        private static async Task<List<ProjectEntity>> ReadProjectsAsync(System.Data.Common.DbCommand command)
        {
            var projects = new List<ProjectEntity>();
            using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                projects.Add(new ProjectEntity
                {
                    Id = reader.GetInt32(0),
                    PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                    Name = reader.GetString(2),
                    Description = reader.IsDBNull(3) ? null : reader.GetString(3),
                    OwnerId = reader.GetInt32(4),
                    CreatedAt = reader.GetDateTime(5),
                    IsArchived = reader.GetBoolean(6),
                    ArchivedAt = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                    UpdatedAt = reader.IsDBNull(8) ? null : reader.GetDateTime(8)
                });
            }
            return projects;
        }
    }
}