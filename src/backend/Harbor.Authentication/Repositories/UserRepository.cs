using Npgsql;
using Harbor.Authentication.Models;
using Harbor.Authentication.Data;

namespace Harbor.Authentication.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly DbConnectionFactory _dbFactory;

        public UserRepository(DbConnectionFactory dbFactory)
        {
            _dbFactory = dbFactory;
        }

        public async Task<User?> GetByUsernameOrEmailAsync(string username, string email)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\" " +
                "FROM \"Users\" WHERE \"Username\" = @username OR \"Email\" = @email LIMIT 1";
            command.Parameters.AddWithValue("username", username);
            command.Parameters.AddWithValue("email", email);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new User
                {
                    Id = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    Email = reader.GetString(2),
                    PasswordHash = reader.GetString(3),
                    Role = reader.GetString(4),
                    CreatedAt = reader.GetDateTime(5)
                };
            }

            return null;
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\" " +
                "FROM \"Users\" WHERE \"Username\" = @username LIMIT 1";
            command.Parameters.AddWithValue("username", username);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new User
                {
                    Id = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    Email = reader.GetString(2),
                    PasswordHash = reader.GetString(3),
                    Role = reader.GetString(4),
                    CreatedAt = reader.GetDateTime(5)
                };
            }

            return null;
        }

        public async Task<int> CreateUserAsync(User user)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"Users\" (\"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\") " +
                "VALUES (@username, @email, @passwordHash, @role, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("username", user.Username);
            command.Parameters.AddWithValue("email", user.Email);
            command.Parameters.AddWithValue("passwordHash", user.PasswordHash);
            command.Parameters.AddWithValue("role", user.Role);
            command.Parameters.AddWithValue("createdAt", DateTime.UtcNow);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }
    }
}
