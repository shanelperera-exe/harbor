using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Npgsql;

namespace Harbor.Deployment.Repositories;

public class NotificationRepository(DbConnectionFactory dbFactory) : INotificationRepository
{
    public async Task<int> CreateAsync(NotificationEntity notification)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO ""Notifications"" (""UserId"", ""DeploymentId"", ""Type"", ""Title"", ""Message"")
            VALUES (@userId, @deploymentId, @type, @title, @message)
            RETURNING ""Id"";";
        cmd.Parameters.AddWithValue("userId", notification.UserId);
        cmd.Parameters.AddWithValue("deploymentId", notification.DeploymentId);
        cmd.Parameters.AddWithValue("type", notification.Type);
        cmd.Parameters.AddWithValue("title", notification.Title);
        cmd.Parameters.AddWithValue("message", notification.Message);

        var result = await cmd.ExecuteScalarAsync();
        return Convert.ToInt32(result);
    }

    public async Task<IReadOnlyList<NotificationEntity>> GetByUserIdAsync(int userId, int limit = 20)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT
                n.""Id"",
                n.""UserId"",
                n.""DeploymentId"",
                n.""Type"",
                n.""Title"",
                n.""Message"",
                n.""IsRead"",
                n.""CreatedAt"",
                d.""Environment"",
                d.""Version"",
                s.""Name""  AS ""ServiceName"",
                p.""Name""  AS ""ProjectName""
            FROM ""Notifications"" n
            JOIN ""Deployments"" d  ON n.""DeploymentId"" = d.""Id""
            JOIN ""Services""   s  ON d.""ServiceId""    = s.""Id""
            JOIN ""Projects""   p  ON s.""ProjectId""    = p.""Id""
            WHERE n.""UserId"" = @userId
            ORDER BY n.""CreatedAt"" DESC
            LIMIT @limit;";
        cmd.Parameters.AddWithValue("userId", userId);
        cmd.Parameters.AddWithValue("limit", limit);

        var list = new List<NotificationEntity>();
        await using var reader = await cmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new NotificationEntity
            {
                Id           = reader.GetInt32(0),
                UserId       = reader.GetInt32(1),
                DeploymentId = reader.GetInt32(2),
                Type         = reader.GetString(3),
                Title        = reader.GetString(4),
                Message      = reader.GetString(5),
                IsRead       = reader.GetBoolean(6),
                CreatedAt    = reader.GetDateTime(7),
                Environment  = reader.IsDBNull(8)  ? null : reader.GetString(8),
                Version      = reader.IsDBNull(9)  ? null : reader.GetString(9),
                ServiceName  = reader.IsDBNull(10) ? null : reader.GetString(10),
                ProjectName  = reader.IsDBNull(11) ? null : reader.GetString(11),
            });
        }

        return list;
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            SELECT COUNT(1)
            FROM ""Notifications""
            WHERE ""UserId"" = @userId AND ""IsRead"" = FALSE;";
        cmd.Parameters.AddWithValue("userId", userId);

        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE ""Notifications""
            SET    ""IsRead"" = TRUE
            WHERE  ""Id"" = @id AND ""UserId"" = @userId;";
        cmd.Parameters.AddWithValue("id", notificationId);
        cmd.Parameters.AddWithValue("userId", userId);

        var rows = await cmd.ExecuteNonQueryAsync();
        return rows > 0;
    }

    public async Task MarkAllAsReadAsync(int userId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            UPDATE ""Notifications""
            SET    ""IsRead"" = TRUE
            WHERE  ""UserId"" = @userId AND ""IsRead"" = FALSE;";
        cmd.Parameters.AddWithValue("userId", userId);

        await cmd.ExecuteNonQueryAsync();
    }
}
