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
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\", \"AvatarSvg\" " +
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
                    CreatedAt = reader.GetDateTime(5),
                    AvatarSvg = reader.IsDBNull(6) ? null : reader.GetString(6)
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
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\", \"AvatarSvg\" " +
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
                    CreatedAt = reader.GetDateTime(5),
                    AvatarSvg = reader.IsDBNull(6) ? null : reader.GetString(6)
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
                "INSERT INTO \"Users\" (\"Username\", \"Email\", \"PasswordHash\", \"Role\", \"AvatarSvg\", \"CreatedAt\") " +
                "VALUES (@username, @email, @passwordHash, @role, @avatarSvg, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("username", user.Username);
            command.Parameters.AddWithValue("email", user.Email);
            command.Parameters.AddWithValue("passwordHash", user.PasswordHash);
            command.Parameters.AddWithValue("role", user.Role);
            command.Parameters.AddWithValue("avatarSvg", user.AvatarSvg ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("createdAt", DateTime.UtcNow);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<User?> GetByEmailAsync(string email)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\", \"PasswordResetToken\", \"PasswordResetTokenExpiry\", \"AvatarSvg\" " +
                "FROM \"Users\" WHERE \"Email\" = @email LIMIT 1";
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
                    CreatedAt = reader.GetDateTime(5),
                    PasswordResetToken = reader.IsDBNull(6) ? null : reader.GetString(6),
                    PasswordResetTokenExpiry = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                    AvatarSvg = reader.IsDBNull(8) ? null : reader.GetString(8)
                };
            }

            return null;
        }

        public async Task UpdatePasswordResetTokenAsync(int userId, string? token, DateTime? expiry)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"Users\" SET \"PasswordResetToken\" = @token, \"PasswordResetTokenExpiry\" = @expiry WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("token", token ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("expiry", expiry ?? (object)DBNull.Value);

            await command.ExecuteNonQueryAsync();
        }

        public async Task<User?> GetByResetTokenAsync(string token)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\", \"PasswordResetToken\", \"PasswordResetTokenExpiry\", \"AvatarSvg\" " +
                "FROM \"Users\" WHERE \"PasswordResetToken\" = @token LIMIT 1";
            command.Parameters.AddWithValue("token", token);

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
                    CreatedAt = reader.GetDateTime(5),
                    PasswordResetToken = reader.IsDBNull(6) ? null : reader.GetString(6),
                    PasswordResetTokenExpiry = reader.IsDBNull(7) ? null : reader.GetDateTime(7),
                    AvatarSvg = reader.IsDBNull(8) ? null : reader.GetString(8)
                };
            }

            return null;
        }

        public async Task UpdatePasswordAsync(int userId, string passwordHash)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"Users\" SET \"PasswordHash\" = @passwordHash WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("passwordHash", passwordHash);

            await command.ExecuteNonQueryAsync();
        }

        public async Task UpdateAvatarAsync(int userId, string avatarSvg)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"Users\" SET \"AvatarSvg\" = @avatarSvg WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("avatarSvg", avatarSvg);

            await command.ExecuteNonQueryAsync();
        }
    }
}
