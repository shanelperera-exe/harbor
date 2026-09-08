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
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"Projects\" (\"Name\", \"Description\", \"RepositoryUrl\", \"OwnerId\", \"CreatedAt\") " +
                "VALUES (@name, @description, @repositoryUrl, @ownerId, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("name", project.Name);
            command.Parameters.AddWithValue("description", project.Description ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("repositoryUrl", project.RepositoryUrl ?? (object)DBNull.Value);
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

        public async Task<List<ProjectEntity>> GetByOwnerAsync(int ownerId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Name\", \"Description\", \"RepositoryUrl\", \"OwnerId\", \"CreatedAt\" " +
                "FROM \"Projects\" WHERE \"OwnerId\" = @ownerId ORDER BY \"CreatedAt\" DESC";
            command.Parameters.AddWithValue("ownerId", ownerId);

            return await ReadProjectsAsync(command);
        }

        public async Task<List<ProjectEntity>> GetAllAsync()
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Name\", \"Description\", \"RepositoryUrl\", \"OwnerId\", \"CreatedAt\" " +
                "FROM \"Projects\" ORDER BY \"CreatedAt\" DESC";

            return await ReadProjectsAsync(command);
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
                    Name = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                    RepositoryUrl = reader.IsDBNull(3) ? null : reader.GetString(3),
                    OwnerId = reader.GetInt32(4),
                    CreatedAt = reader.GetDateTime(5)
                });
            }
            return projects;
        }
    }
}