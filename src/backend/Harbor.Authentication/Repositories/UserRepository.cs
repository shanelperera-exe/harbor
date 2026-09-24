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
                "INSERT INTO \"Users\" (\"Username\", \"Email\", \"PasswordHash\", \"Role\", \"AvatarSvg\", \"HasPassword\", \"CreatedAt\") " +
                "VALUES (@username, @email, @passwordHash, @role, @avatarSvg, @hasPassword, @createdAt) " +
                "RETURNING \"Id\";";
            command.Parameters.AddWithValue("username", user.Username);
            command.Parameters.AddWithValue("email", user.Email);
            command.Parameters.AddWithValue("passwordHash", user.PasswordHash);
            command.Parameters.AddWithValue("role", user.Role);
            command.Parameters.AddWithValue("avatarSvg", user.AvatarSvg ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("hasPassword", user.HasPassword);
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

        public async Task<User?> GetByIdAsync(int userId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"Id\", \"Username\", \"Email\", \"PasswordHash\", \"Role\", \"CreatedAt\", \"AvatarSvg\" " +
                "FROM \"Users\" WHERE \"Id\" = @userId LIMIT 1";
            command.Parameters.AddWithValue("userId", userId);

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
            command.CommandText = "UPDATE \"Users\" SET \"PasswordHash\" = @passwordHash, \"HasPassword\" = TRUE WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("passwordHash", passwordHash);

            await command.ExecuteNonQueryAsync();
        }

        public async Task<bool> GetHasPasswordAsync(int userId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT \"HasPassword\" FROM \"Users\" WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            return (bool?)await command.ExecuteScalarAsync() ?? false;
        }

        public async Task<User?> GetByExternalIdentityAsync(string provider, string providerUserId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT u.\"Id\", u.\"Username\", u.\"Email\", u.\"PasswordHash\", u.\"Role\", u.\"CreatedAt\", u.\"AvatarSvg\", u.\"HasPassword\" FROM \"Users\" u INNER JOIN \"ExternalIdentities\" e ON e.\"UserId\" = u.\"Id\" WHERE e.\"Provider\" = @provider AND e.\"ProviderUserId\" = @providerUserId LIMIT 1";
            command.Parameters.AddWithValue("provider", provider);
            command.Parameters.AddWithValue("providerUserId", providerUserId);
            using var reader = await command.ExecuteReaderAsync();
            if (!await reader.ReadAsync()) return null;
            return new User
            {
                Id = reader.GetInt32(0), Username = reader.GetString(1), Email = reader.GetString(2),
                PasswordHash = reader.GetString(3), Role = reader.GetString(4), CreatedAt = reader.GetDateTime(5),
                AvatarSvg = reader.IsDBNull(6) ? null : reader.GetString(6), HasPassword = reader.GetBoolean(7)
            };
        }

        public async Task AddExternalIdentityAsync(int userId, string provider, string providerUserId, string? providerEmail, string? accessToken = null)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "INSERT INTO \"ExternalIdentities\" (\"UserId\", \"Provider\", \"ProviderUserId\", \"ProviderEmail\", \"AccessToken\") VALUES (@userId, @provider, @providerUserId, @providerEmail, @accessToken) ON CONFLICT (\"UserId\", \"Provider\") DO UPDATE SET \"ProviderUserId\" = EXCLUDED.\"ProviderUserId\", \"ProviderEmail\" = EXCLUDED.\"ProviderEmail\", \"AccessToken\" = COALESCE(EXCLUDED.\"AccessToken\", \"ExternalIdentities\".\"AccessToken\")";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("provider", provider);
            command.Parameters.AddWithValue("providerUserId", providerUserId);
            command.Parameters.AddWithValue("providerEmail", providerEmail ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("accessToken", accessToken ?? (object)DBNull.Value);
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

        public async Task UpdateProfileAsync(int userId, string username, string email, string avatarSvg)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"Users\" SET \"Username\" = @username, \"Email\" = @email, \"AvatarSvg\" = @avatarSvg WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("username", username);
            command.Parameters.AddWithValue("email", email);
            command.Parameters.AddWithValue("avatarSvg", avatarSvg);

            await command.ExecuteNonQueryAsync();
        }

        public async Task<string[]> GetExternalLoginMethodsAsync(int userId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "SELECT COALESCE(array_agg(\"Provider\" ORDER BY \"Provider\"), ARRAY[]::text[]) FROM \"ExternalIdentities\" WHERE \"UserId\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            var value = await command.ExecuteScalarAsync();
            return value is string[] providers ? providers : Array.Empty<string>();
        }

        public async Task AddExternalLoginMethodAsync(int userId, string provider)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText = "UPDATE \"Users\" SET \"ExternalLoginMethods\" = CASE WHEN \"ExternalLoginMethods\" = '' THEN @provider WHEN POSITION(',' || @provider || ',' IN ',' || \"ExternalLoginMethods\" || ',') = 0 THEN \"ExternalLoginMethods\" || ',' || @provider ELSE \"ExternalLoginMethods\" END WHERE \"Id\" = @userId";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("provider", provider);
            await command.ExecuteNonQueryAsync();
        }
        public async Task<string?> GetExternalAccessTokenAsync(int userId, string provider)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT \"AccessToken\" FROM \"ExternalIdentities\" WHERE \"UserId\" = @userId AND \"Provider\" = @provider LIMIT 1";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("provider", provider);
            
            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return reader.IsDBNull(0) ? null : reader.GetString(0);
            }
            return null;
        }

        public async Task<UserPreferences> GetPreferencesAsync(int userId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT \"UserId\", \"DashboardTheme\", \"LogTheme\", \"UpdatedAt\" " +
                "FROM \"UserPreferences\" WHERE \"UserId\" = @userId LIMIT 1";
            command.Parameters.AddWithValue("userId", userId);

            using var reader = await command.ExecuteReaderAsync();
            if (await reader.ReadAsync())
            {
                return new UserPreferences
                {
                    UserId = reader.GetInt32(0),
                    DashboardTheme = reader.GetString(1),
                    LogTheme = reader.GetString(2),
                    UpdatedAt = reader.GetDateTime(3)
                };
            }

            return new UserPreferences { UserId = userId };
        }

        public async Task<UserPreferences> UpsertPreferencesAsync(int userId, string dashboardTheme, string logTheme)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();

            using var command = connection.CreateCommand();
            command.CommandText =
                "INSERT INTO \"UserPreferences\" (\"UserId\", \"DashboardTheme\", \"LogTheme\", \"UpdatedAt\") " +
                "VALUES (@userId, @dashboardTheme, @logTheme, CURRENT_TIMESTAMP) " +
                "ON CONFLICT (\"UserId\") DO UPDATE SET " +
                "\"DashboardTheme\" = EXCLUDED.\"DashboardTheme\", " +
                "\"LogTheme\" = EXCLUDED.\"LogTheme\", " +
                "\"UpdatedAt\" = CURRENT_TIMESTAMP " +
                "RETURNING \"UserId\", \"DashboardTheme\", \"LogTheme\", \"UpdatedAt\"";
            command.Parameters.AddWithValue("userId", userId);
            command.Parameters.AddWithValue("dashboardTheme", dashboardTheme);
            command.Parameters.AddWithValue("logTheme", logTheme);

            using var reader = await command.ExecuteReaderAsync();
            await reader.ReadAsync();
            return new UserPreferences
            {
                UserId = reader.GetInt32(0),
                DashboardTheme = reader.GetString(1),
                LogTheme = reader.GetString(2),
                UpdatedAt = reader.GetDateTime(3)
            };
        }

        public async Task<bool> RemoveExternalIdentityAsync(int userId, string provider)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            using var deleteCommand = connection.CreateCommand();
            deleteCommand.Transaction = transaction;
            deleteCommand.CommandText = "DELETE FROM \"ExternalIdentities\" WHERE \"UserId\" = @userId AND \"Provider\" = @provider";
            deleteCommand.Parameters.AddWithValue("userId", userId);
            deleteCommand.Parameters.AddWithValue("provider", provider);
            var deleted = await deleteCommand.ExecuteNonQueryAsync();

            using var legacyCommand = connection.CreateCommand();
            legacyCommand.Transaction = transaction;
            legacyCommand.CommandText =
                "UPDATE \"Users\" SET \"ExternalLoginMethods\" = array_to_string(" +
                "ARRAY(SELECT value FROM unnest(string_to_array(\"ExternalLoginMethods\", ',')) value WHERE trim(value) <> '' AND value <> @provider), ',') " +
                "WHERE \"Id\" = @userId";
            legacyCommand.Parameters.AddWithValue("userId", userId);
            legacyCommand.Parameters.AddWithValue("provider", provider);
            await legacyCommand.ExecuteNonQueryAsync();

            await transaction.CommitAsync();
            return deleted > 0;
        }

        public async Task<bool> DeleteAccountAsync(int userId)
        {
            using var connection = _dbFactory.CreateConnection();
            await connection.OpenAsync();
            await using var transaction = await connection.BeginTransactionAsync();

            var hasProjects = await TableExistsAsync(connection, transaction, "Projects");
            var hasEnvironments = await TableExistsAsync(connection, transaction, "Environments");
            var hasDeployments = await TableExistsAsync(connection, transaction, "Deployments");

            if (hasDeployments)
            {
                await ExecuteNonQueryAsync(connection, transaction, "DELETE FROM \"Deployments\" WHERE \"OwnerId\" = @userId", userId);
            }

            if (hasProjects && hasEnvironments)
            {
                await ExecuteNonQueryAsync(
                    connection,
                    transaction,
                    "DELETE FROM \"Environments\" e USING \"Projects\" p WHERE e.\"ProjectId\" = p.\"Id\" AND p.\"OwnerId\" = @userId",
                    userId);
            }

            if (hasProjects)
            {
                await ExecuteNonQueryAsync(connection, transaction, "DELETE FROM \"Projects\" WHERE \"OwnerId\" = @userId", userId);
            }

            var deletedUsers = await ExecuteNonQueryAsync(connection, transaction, "DELETE FROM \"Users\" WHERE \"Id\" = @userId", userId);
            await transaction.CommitAsync();
            return deletedUsers > 0;
        }

        private static async Task<bool> TableExistsAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string tableName)
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "SELECT to_regclass(@tableName) IS NOT NULL";
            command.Parameters.AddWithValue("tableName", $"public.\"{tableName}\"");
            return (bool?)await command.ExecuteScalarAsync() ?? false;
        }

        private static async Task<int> ExecuteNonQueryAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, string commandText, int userId)
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = commandText;
            command.Parameters.AddWithValue("userId", userId);
            return await command.ExecuteNonQueryAsync();
        }
    }
}
