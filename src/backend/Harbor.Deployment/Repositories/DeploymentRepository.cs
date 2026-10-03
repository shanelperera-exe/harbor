using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Npgsql;

namespace Harbor.Deployment.Repositories;

public class DeploymentRepository(DbConnectionFactory dbFactory) : IDeploymentRepository
{
    public Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, int serviceId, string? status, int skip, int take) =>
        GetHistoryAsync(ownerId, null, null, serviceId.ToString(), status, skip, take);

    public async Task<(IReadOnlyList<DeploymentEntity> Items, int TotalCount)> GetHistoryAsync(int ownerId, string? projectId, string? environment, string? serviceId, string? status, int skip, int take)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        var whereClauses = new List<string> { 
            "d.\"ServiceId\" IN (SELECT s.\"Id\" FROM \"Services\" s JOIN \"Projects\" p ON s.\"ProjectId\" = p.\"Id\" WHERE p.\"OwnerId\" = @ownerId)"
        };
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            whereClauses.Add("p.\"Id\"::text = @projectId");
        }
        if (!string.IsNullOrWhiteSpace(environment))
        {
            whereClauses.Add("LOWER(d.\"Environment\") = LOWER(@environment)");
        }
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            whereClauses.Add("""
                EXISTS (
                    SELECT 1
                    FROM "Services" s
                    WHERE s."Id" = d."ServiceId"
                      AND (s."PublicId" = @serviceId OR s."Id"::text = @serviceId)
                )
                """);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            whereClauses.Add("LOWER(d.\"Status\") = LOWER(@status)");
        }
        var filter = "WHERE " + string.Join(" AND ", whereClauses);

        await using var count = connection.CreateCommand();
        count.CommandText = $@"
            SELECT COUNT(1) FROM ""Deployments"" d
            JOIN ""Services"" s ON d.""ServiceId"" = s.""Id""
            JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id""
            {filter}";
        AddFilters(count, ownerId, projectId, environment, serviceId, status);
        var total = Convert.ToInt32(await count.ExecuteScalarAsync());

        await using var command = connection.CreateCommand();
        command.CommandText = $@"
            SELECT d.""Id"", d.""PublicId"", d.""ServiceId"", d.""OwnerId"", d.""Environment"", d.""Version"", d.""CommitSha"", d.""Status"", d.""StartedAt"", d.""CompletedAt"", d.""FailureReason"", d.""WorkflowFile"", d.""WorkflowRef"", d.""TriggerError"", d.""WorkflowRunId"", d.""WorkflowRunUrl"",
                   p.""Name"" AS ""ProjectName"", s.""Name"" AS ""ServiceName"", s.""Type"" AS ""ServiceType"", u.""Username"" AS ""UserName"", d.""CommitMessage""
            FROM ""Deployments"" d
            JOIN ""Services"" s ON d.""ServiceId"" = s.""Id""
            JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id""
            LEFT JOIN ""Users"" u ON d.""OwnerId"" = u.""Id""
            {filter}
            ORDER BY d.""StartedAt"" DESC, d.""Id"" DESC
            OFFSET @skip LIMIT @take";
        AddFilters(command, ownerId, projectId, environment, serviceId, status);
        command.Parameters.AddWithValue("skip", skip);
        command.Parameters.AddWithValue("take", take);
        
        var result = new List<DeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) 
        {
            var entity = new DeploymentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ServiceId = reader.GetInt32(2),
                OwnerId = reader.GetInt32(3),
                Environment = reader.GetString(4),
                Version = reader.GetString(5),
                CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                StartedAt = reader.GetDateTime(8),
                CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
                WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
                WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
                TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
                WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
                WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
                ProjectName = reader.IsDBNull(16) ? null : reader.GetString(16),
                ServiceName = reader.IsDBNull(17) ? null : reader.GetString(17),
                ServiceType = reader.IsDBNull(18) ? null : reader.GetString(18),
                UserName = reader.IsDBNull(19) ? null : reader.GetString(19),
                CommitMessage = reader.IsDBNull(20) ? null : reader.GetString(20)
            };
            result.Add(entity);
        }

        return (result, total);
    }

    public async Task<DeploymentEntity?> GetByIdAsync(int id, int ownerId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\", \"WorkflowFile\", \"WorkflowRef\", \"TriggerError\", \"WorkflowRunId\", \"WorkflowRunUrl\" FROM \"Deployments\" WHERE \"Id\" = @id AND \"OwnerId\" = @ownerId";
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("ownerId", ownerId);
        return (await ReadDeploymentsAsync(command)).SingleOrDefault();
    }

    public async Task<DeploymentEntity?> GetEntityByIdentifierAsync(string identifier, int userId, bool isAdmin)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT d.""Id"", d.""PublicId"", d.""ServiceId"", d.""OwnerId"", d.""Environment"", d.""Version"", d.""CommitSha"", d.""Status"", d.""StartedAt"", d.""CompletedAt"", d.""FailureReason"", d.""WorkflowFile"", d.""WorkflowRef"", d.""TriggerError"", d.""WorkflowRunId"", d.""WorkflowRunUrl"", p.""Name"" AS ""ProjectName"", s.""Name"" AS ""ServiceName"", s.""Type"" AS ""ServiceType"", u.""Username"" AS ""UserName"", d.""CommitMessage"" 
                                FROM ""Deployments"" d 
                                JOIN ""Services"" s ON d.""ServiceId"" = s.""Id"" 
                                JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id"" 
                                LEFT JOIN ""Users"" u ON d.""OwnerId"" = u.""Id"" 
                                WHERE (d.""Id""::text = @identifier OR d.""PublicId"" = @identifier) AND (@isAdmin OR p.""OwnerId"" = @userId)";
        command.Parameters.AddWithValue("identifier", identifier);
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("isAdmin", isAdmin);
        var result = new List<DeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            result.Add(new DeploymentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ServiceId = reader.GetInt32(2),
                OwnerId = reader.GetInt32(3),
                Environment = reader.GetString(4),
                Version = reader.GetString(5),
                CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                StartedAt = reader.GetDateTime(8),
                CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
                WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
                WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
                TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
                WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
                WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
                ProjectName = reader.IsDBNull(16) ? null : reader.GetString(16),
                ServiceName = reader.IsDBNull(17) ? null : reader.GetString(17),
                ServiceType = reader.IsDBNull(18) ? null : reader.GetString(18),
                UserName = reader.IsDBNull(19) ? null : reader.GetString(19),
                CommitMessage = reader.IsDBNull(20) ? null : reader.GetString(20)
            });
        }
        return result.SingleOrDefault();
    }

    public async Task<DeploymentEntity?> GetEntityByIdAsync(int id)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT d.""Id"", d.""PublicId"", d.""ServiceId"", d.""OwnerId"", d.""Environment"", d.""Version"", d.""CommitSha"", d.""Status"", d.""StartedAt"", d.""CompletedAt"", d.""FailureReason"", d.""WorkflowFile"", d.""WorkflowRef"", d.""TriggerError"", d.""WorkflowRunId"", d.""WorkflowRunUrl"", p.""Name"" AS ""ProjectName"", s.""Name"" AS ""ServiceName"", s.""Type"" AS ""ServiceType"", u.""Username"" AS ""UserName"", d.""CommitMessage"" 
                                FROM ""Deployments"" d 
                                JOIN ""Services"" s ON d.""ServiceId"" = s.""Id"" 
                                JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id"" 
                                LEFT JOIN ""Users"" u ON d.""OwnerId"" = u.""Id"" 
                                WHERE d.""Id"" = @id";
        command.Parameters.AddWithValue("id", id);
        var result = new List<DeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            result.Add(new DeploymentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ServiceId = reader.GetInt32(2),
                OwnerId = reader.GetInt32(3),
                Environment = reader.GetString(4),
                Version = reader.GetString(5),
                CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                StartedAt = reader.GetDateTime(8),
                CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
                WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
                WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
                TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
                WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
                WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
                ProjectName = reader.IsDBNull(16) ? null : reader.GetString(16),
                ServiceName = reader.IsDBNull(17) ? null : reader.GetString(17),
                ServiceType = reader.IsDBNull(18) ? null : reader.GetString(18),
                UserName = reader.IsDBNull(19) ? null : reader.GetString(19),
                CommitMessage = reader.IsDBNull(20) ? null : reader.GetString(20)
            });
        }
        return result.SingleOrDefault();
    }

    public async Task<IReadOnlyList<DeploymentLogEntity>> GetLogsAsync(int deploymentId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"DeploymentId\", \"Timestamp\", \"Level\", \"Message\" FROM \"DeploymentLogs\" WHERE \"DeploymentId\" = @deploymentId ORDER BY \"Timestamp\", \"Id\"";
        command.Parameters.AddWithValue("deploymentId", deploymentId);
        var result = new List<DeploymentLogEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(new DeploymentLogEntity { Id = reader.GetInt32(0), DeploymentId = reader.GetInt32(1), Timestamp = reader.GetDateTime(2), Level = reader.GetString(3), Message = reader.GetString(4) });
        return result;
    }

    public async Task<int> CreateAsync(DeploymentEntity deployment)
    {
        var publicId = string.IsNullOrEmpty(deployment.PublicId) ? Harbor.Common.Utilities.IdGenerator.DeploymentId() : deployment.PublicId;
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO \"Deployments\" (\"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"WorkflowFile\", \"WorkflowRef\", \"CommitMessage\") VALUES (@publicId, @serviceId, @ownerId, @environment, @version, @commitSha, @status, @startedAt, @workflowFile, @workflowRef, @commitMessage) RETURNING \"Id\";";
        command.Parameters.AddWithValue("publicId", publicId);
        command.Parameters.AddWithValue("serviceId", deployment.ServiceId);
        command.Parameters.AddWithValue("ownerId", deployment.OwnerId);
        command.Parameters.AddWithValue("environment", deployment.Environment);
        command.Parameters.AddWithValue("version", deployment.Version);
        command.Parameters.AddWithValue("commitSha", (object?)deployment.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("commitMessage", (object?)deployment.CommitMessage ?? DBNull.Value);
        command.Parameters.AddWithValue("status", deployment.Status);
        command.Parameters.AddWithValue("startedAt", deployment.StartedAt);
        command.Parameters.AddWithValue("workflowFile", (object?)deployment.WorkflowFile ?? DBNull.Value);
        command.Parameters.AddWithValue("workflowRef", (object?)deployment.WorkflowRef ?? DBNull.Value);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<bool> UpdateTriggerResultAsync(int deploymentId, string status, string? failureReason, string? triggerError)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"Deployments\" SET \"Status\" = @status, \"FailureReason\" = @failureReason, \"TriggerError\" = @triggerError, \"CompletedAt\" = CASE WHEN @status IN ('Failed', 'Succeeded') THEN now() ELSE \"CompletedAt\" END WHERE \"Id\" = @id";
        command.Parameters.AddWithValue("id", deploymentId);
        command.Parameters.AddWithValue("status", status);
        command.Parameters.AddWithValue("failureReason", (object?)failureReason ?? DBNull.Value);
        command.Parameters.AddWithValue("triggerError", (object?)triggerError ?? DBNull.Value);
        return await command.ExecuteNonQueryAsync() == 1;
    }

    public async Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason = null)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"Deployments\" SET \"Status\" = @status, \"FailureReason\" = @failureReason, \"CompletedAt\" = CASE WHEN @status IN ('Failed', 'Successful') THEN now() ELSE \"CompletedAt\" END WHERE \"Id\" = @id";
        command.Parameters.AddWithValue("id", deploymentId);
        command.Parameters.AddWithValue("status", status);
        command.Parameters.AddWithValue("failureReason", (object?)failureReason ?? DBNull.Value);
        return await command.ExecuteNonQueryAsync() == 1;
    }

    public async Task<string?> GetRepositoryNameAsync(int serviceId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"RepositoryName\" FROM \"Services\" WHERE \"Id\" = @serviceId";
        command.Parameters.AddWithValue("serviceId", serviceId);
        return await command.ExecuteScalarAsync() as string;
    }

    public async Task<string?> GetWorkflowFileAsync(int serviceId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"WorkflowFile\" FROM \"Services\" WHERE \"Id\" = @serviceId";
        command.Parameters.AddWithValue("serviceId", serviceId);
        return await command.ExecuteScalarAsync() as string;
    }

    public async Task<(bool Exists, int OwnerId, bool IsArchived, int ProjectId, int RealServiceId)> GetServiceAccessAsync(string serviceIdOrPublicId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        if (int.TryParse(serviceIdOrPublicId, out var serviceId))
        {
            command.CommandText = "SELECT p.\"OwnerId\", p.\"IsArchived\", s.\"ProjectId\", s.\"Id\" FROM \"Services\" s JOIN \"Projects\" p ON s.\"ProjectId\" = p.\"Id\" WHERE s.\"Id\" = @serviceId OR s.\"PublicId\" = @publicId;";
            command.Parameters.AddWithValue("serviceId", serviceId);
            command.Parameters.AddWithValue("publicId", serviceIdOrPublicId);
        }
        else
        {
            command.CommandText = "SELECT p.\"OwnerId\", p.\"IsArchived\", s.\"ProjectId\", s.\"Id\" FROM \"Services\" s JOIN \"Projects\" p ON s.\"ProjectId\" = p.\"Id\" WHERE s.\"PublicId\" = @publicId;";
            command.Parameters.AddWithValue("publicId", serviceIdOrPublicId);
        }

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (true, reader.GetInt32(0), reader.GetBoolean(1), reader.GetInt32(2), reader.GetInt32(3))
            : (false, 0, false, 0, 0);
    }

    public async Task<(bool Exists, bool IsActive, string Type, string? DeploymentUrl)?> GetEnvironmentByNameAsync(int projectId, string environmentName)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"IsActive\", \"Type\", \"DeploymentUrl\" FROM \"Environments\" WHERE \"ProjectId\" = @projectId AND \"Name\" = @environmentName;";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);

        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (true, reader.GetBoolean(0), reader.GetString(1), reader.IsDBNull(2) ? null : reader.GetString(2))
            : null;
    }

    public async Task SetWorkflowRunAsync(int deploymentId, long workflowRunId, string runUrl)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE \"Deployments\" SET \"WorkflowRunId\" = @runId, \"WorkflowRunUrl\" = @runUrl WHERE \"Id\" = @id";
        command.Parameters.AddWithValue("id", deploymentId);
        command.Parameters.AddWithValue("runId", workflowRunId);
        command.Parameters.AddWithValue("runUrl", (object?)runUrl ?? DBNull.Value);
        await command.ExecuteNonQueryAsync();
    }

    public async Task<DeploymentEntity?> GetByWorkflowRunIdAsync(long workflowRunId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = "SELECT \"Id\", \"PublicId\", \"ServiceId\", \"OwnerId\", \"Environment\", \"Version\", \"CommitSha\", \"Status\", \"StartedAt\", \"CompletedAt\", \"FailureReason\", \"WorkflowFile\", \"WorkflowRef\", \"TriggerError\", \"WorkflowRunId\", \"WorkflowRunUrl\" FROM \"Deployments\" WHERE \"WorkflowRunId\" = @runId";
        command.Parameters.AddWithValue("runId", workflowRunId);
        return (await ReadDeploymentsAsync(command)).SingleOrDefault();
    }

    private static void AddFilters(NpgsqlCommand command, int ownerId, string? projectId, string? environment, string? serviceId, string? status)
    {
        command.Parameters.AddWithValue("ownerId", ownerId);
        if (!string.IsNullOrWhiteSpace(projectId))
        {
            command.Parameters.AddWithValue("projectId", projectId);
        }
        if (!string.IsNullOrWhiteSpace(environment))
        {
            command.Parameters.AddWithValue("environment", environment);
        }
        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            command.Parameters.AddWithValue("serviceId", serviceId);
        }
        if (!string.IsNullOrWhiteSpace(status))
        {
            command.Parameters.AddWithValue("status", status);
        }
    }

    private static async Task<List<DeploymentEntity>> ReadDeploymentsAsync(NpgsqlCommand command)
    {
        var result = new List<DeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(new DeploymentEntity
        {
            Id = reader.GetInt32(0),
            PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
            ServiceId = reader.GetInt32(2),
            OwnerId = reader.GetInt32(3),
            Environment = reader.GetString(4),
            Version = reader.GetString(5),
            CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
            Status = reader.GetString(7),
            StartedAt = reader.GetDateTime(8),
            CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
            FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
            WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
            WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
            TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
            WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
            WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
        });
        return result;
    }

    public async Task AddLogsAsync(int deploymentId, string logText)
    {
        if (string.IsNullOrWhiteSpace(logText)) return;
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        // Split log into individual lines and insert each as a DeploymentLog record
        var lines = logText.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        var now = DateTime.UtcNow;
        foreach (var line in lines)
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "INSERT INTO \"DeploymentLogs\" (\"DeploymentId\", \"Timestamp\", \"Level\", \"Message\") VALUES (@deploymentId, @ts, @level, @message) ON CONFLICT DO NOTHING";
            cmd.Parameters.AddWithValue("deploymentId", deploymentId);
            cmd.Parameters.AddWithValue("ts", now);
            cmd.Parameters.AddWithValue("level", "Info");
            cmd.Parameters.AddWithValue("message", trimmed.Length > 4000 ? trimmed[..4000] : trimmed);
            await cmd.ExecuteNonQueryAsync();
        }
    }

    // ── Service lookup by repository name ─────────────────────────────────────────

    public async Task<(int? ServiceId, int? OwnerId)?> GetServiceByRepositoryAsync(string repositoryName)
    {
        if (string.IsNullOrWhiteSpace(repositoryName)) return null;
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT s.""Id"", p.""OwnerId"" FROM ""Services"" s JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id"" WHERE s.""RepositoryName"" = @repositoryName";
        command.Parameters.AddWithValue("repositoryName", repositoryName);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync()
            ? (reader.GetInt32(0), reader.GetInt32(1))
            : null;
    }

    // ── CI Run tracking (2.1) ────────────────────────────────────────────────────

    private static async Task<List<CiRunEntity>> ReadCiRunsAsync(NpgsqlCommand command)
    {
        var result = new List<CiRunEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync()) result.Add(new CiRunEntity
        {
            Id = reader.GetInt32(0),
            ServiceId = reader.GetInt32(1),
            OwnerId = reader.GetInt32(2),
            WorkflowName = reader.GetString(3),
            WorkflowFile = reader.GetString(4),
            Branch = reader.GetString(5),
            CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
            Conclusion = reader.IsDBNull(7) ? null : reader.GetString(7),
            Status = reader.GetString(8),
            GitHubRunId = reader.GetInt64(9),
            GitHubRunUrl = reader.IsDBNull(10) ? null : reader.GetString(10),
            StartedAt = reader.GetDateTime(11),
            CompletedAt = reader.IsDBNull(12) ? null : reader.GetDateTime(12),
        });
        return result;
    }

    public async Task<int> CreateCiRunAsync(CiRunEntity ciRun)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"INSERT INTO ""CiRuns"" (""ServiceId"", ""OwnerId"", ""WorkflowName"", ""WorkflowFile"", ""Branch"", ""CommitSha"", ""Conclusion"", ""Status"", ""GitHubRunId"", ""GitHubRunUrl"", ""StartedAt"", ""CompletedAt"") VALUES (@serviceId, @ownerId, @workflowName, @workflowFile, @branch, @commitSha, @conclusion, @status, @githubRunId, @githubRunUrl, @startedAt, @completedAt) RETURNING ""Id"";";
        command.Parameters.AddWithValue("serviceId", ciRun.ServiceId);
        command.Parameters.AddWithValue("ownerId", ciRun.OwnerId);
        command.Parameters.AddWithValue("workflowName", ciRun.WorkflowName);
        command.Parameters.AddWithValue("workflowFile", ciRun.WorkflowFile);
        command.Parameters.AddWithValue("branch", ciRun.Branch);
        command.Parameters.AddWithValue("commitSha", (object?)ciRun.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("conclusion", (object?)ciRun.Conclusion ?? DBNull.Value);
        command.Parameters.AddWithValue("status", ciRun.Status);
        command.Parameters.AddWithValue("githubRunId", ciRun.GitHubRunId);
        command.Parameters.AddWithValue("githubRunUrl", (object?)ciRun.GitHubRunUrl ?? DBNull.Value);
        command.Parameters.AddWithValue("startedAt", ciRun.StartedAt);
        command.Parameters.AddWithValue("completedAt", (object?)ciRun.CompletedAt ?? DBNull.Value);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<bool> UpdateCiRunAsync(CiRunEntity ciRun)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"UPDATE ""CiRuns"" SET ""WorkflowName"" = @workflowName, ""WorkflowFile"" = @workflowFile, ""Branch"" = @branch, ""CommitSha"" = @commitSha, ""Conclusion"" = @conclusion, ""Status"" = @status, ""GitHubRunUrl"" = @githubRunUrl, ""StartedAt"" = @startedAt, ""CompletedAt"" = @completedAt WHERE ""Id"" = @id";
        command.Parameters.AddWithValue("id", ciRun.Id);
        command.Parameters.AddWithValue("workflowName", ciRun.WorkflowName);
        command.Parameters.AddWithValue("workflowFile", ciRun.WorkflowFile);
        command.Parameters.AddWithValue("branch", ciRun.Branch);
        command.Parameters.AddWithValue("commitSha", (object?)ciRun.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("conclusion", (object?)ciRun.Conclusion ?? DBNull.Value);
        command.Parameters.AddWithValue("status", ciRun.Status);
        command.Parameters.AddWithValue("githubRunUrl", (object?)ciRun.GitHubRunUrl ?? DBNull.Value);
        command.Parameters.AddWithValue("startedAt", ciRun.StartedAt);
        command.Parameters.AddWithValue("completedAt", (object?)ciRun.CompletedAt ?? DBNull.Value);
        return await command.ExecuteNonQueryAsync() == 1;
    }

    public async Task<IReadOnlyList<CiRunEntity>> GetCiRunsAsync(int ownerId, int serviceId, int skip, int take)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT ""Id"", ""ServiceId"", ""OwnerId"", ""WorkflowName"", ""WorkflowFile"", ""Branch"", ""CommitSha"", ""Conclusion"", ""Status"", ""GitHubRunId"", ""GitHubRunUrl"", ""StartedAt"", ""CompletedAt"" FROM ""CiRuns"" WHERE ""OwnerId"" = @ownerId AND ""ServiceId"" = @serviceId ORDER BY ""StartedAt"" DESC, ""Id"" DESC OFFSET @skip LIMIT @take";
        command.Parameters.AddWithValue("ownerId", ownerId);
        command.Parameters.AddWithValue("serviceId", serviceId);
        command.Parameters.AddWithValue("skip", skip);
        command.Parameters.AddWithValue("take", take);
        return await ReadCiRunsAsync(command);
    }

    public async Task<int> GetCiRunsTotalCountAsync(int ownerId, int serviceId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT COUNT(1) FROM ""CiRuns"" WHERE ""OwnerId"" = @ownerId AND ""ServiceId"" = @serviceId";
        command.Parameters.AddWithValue("ownerId", ownerId);
        command.Parameters.AddWithValue("serviceId", serviceId);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<CiRunEntity?> GetCiRunByGitHubRunIdAsync(long githubRunId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT ""Id"", ""ServiceId"", ""OwnerId"", ""WorkflowName"", ""WorkflowFile"", ""Branch"", ""CommitSha"", ""Conclusion"", ""Status"", ""GitHubRunId"", ""GitHubRunUrl"", ""StartedAt"", ""CompletedAt"" FROM ""CiRuns"" WHERE ""GitHubRunId"" = @githubRunId";
        command.Parameters.AddWithValue("githubRunId", githubRunId);
        return (await ReadCiRunsAsync(command)).SingleOrDefault();
    }

    // ── Deployment rollback (2.2) ──────────────────────────────────────────────

    private static DeploymentEntity ReadDeploymentEntity(NpgsqlDataReader reader) => new()
    {
        Id = reader.GetInt32(0),
        PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
        ServiceId = reader.GetInt32(2),
        OwnerId = reader.GetInt32(3),
        Environment = reader.GetString(4),
        Version = reader.GetString(5),
        CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
        Status = reader.GetString(7),
        StartedAt = reader.GetDateTime(8),
        CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
        FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
        WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
        WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
        TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
        WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
        WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
    };

    public async Task<DeploymentEntity?> GetSucceededForRedeployAsync(int deploymentId)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT ""Id"", ""PublicId"", ""ServiceId"", ""OwnerId"", ""Environment"",
                ""Version"", ""CommitSha"", ""Status"", ""StartedAt"", ""CompletedAt"", ""FailureReason"",
                ""WorkflowFile"", ""WorkflowRef"", ""TriggerError"", ""WorkflowRunId"", ""WorkflowRunUrl"", ""CommitMessage""
            FROM ""Deployments""
            WHERE ""Id"" = @deploymentId AND ""Status"" = 'Succeeded'";
        command.Parameters.AddWithValue("deploymentId", deploymentId);

        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return null;
        return ReadDeploymentEntity(reader);
    }

    public async Task<int> CreateFromSourceAsync(DeploymentEntity source)
    {
        var publicId = Harbor.Common.Utilities.IdGenerator.DeploymentId();
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"INSERT INTO ""Deployments"" (
                ""PublicId"", ""ServiceId"", ""OwnerId"", ""Environment"", ""Version"", ""CommitSha"",
                ""Status"", ""StartedAt"", ""WorkflowFile"", ""WorkflowRef"", ""WorkflowRunId"", ""WorkflowRunUrl"", ""CommitMessage"")
            VALUES (
                @publicId, @serviceId, @ownerId, @environment, @version, @commitSha,
                @status, @startedAt, @workflowFile, @workflowRef, @workflowRunId, @workflowRunUrl, @commitMessage)
            RETURNING ""Id"";";
        command.Parameters.AddWithValue("publicId", publicId);
        command.Parameters.AddWithValue("serviceId", source.ServiceId);
        command.Parameters.AddWithValue("ownerId", source.OwnerId);
        command.Parameters.AddWithValue("environment", source.Environment);
        command.Parameters.AddWithValue("version", source.Version);
        command.Parameters.AddWithValue("commitSha", (object?)source.CommitSha ?? DBNull.Value);
        command.Parameters.AddWithValue("commitMessage", (object?)source.CommitMessage ?? DBNull.Value);
        command.Parameters.AddWithValue("status", "Pending");
        command.Parameters.AddWithValue("startedAt", DateTime.UtcNow);
        command.Parameters.AddWithValue("workflowFile", (object?)source.WorkflowFile ?? DBNull.Value);
        command.Parameters.AddWithValue("workflowRef", (object?)source.WorkflowRef ?? DBNull.Value);
        command.Parameters.AddWithValue("workflowRunId", source.WorkflowRunId ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("workflowRunUrl", (object?)source.WorkflowRunUrl ?? DBNull.Value);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    public async Task<IReadOnlyList<DashboardProjectEntity>> GetDashboardProjectsAsync(int userId, bool isAdmin)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT p.""Id"", p.""PublicId"", p.""Name"", p.""OwnerId"", p.""CreatedAt"",
                   COUNT(d.""Id"") AS ""TotalDeployments"",
                   (
                       SELECT d2.""Status""
                       FROM ""Deployments"" d2
                       JOIN ""Services"" s2 ON d2.""ServiceId"" = s2.""Id""
                       WHERE s2.""ProjectId"" = p.""Id""
                       ORDER BY d2.""StartedAt"" DESC, d2.""Id"" DESC
                       LIMIT 1
                   ) AS ""LatestStatus"",
                   (
                       SELECT d2.""StartedAt""
                       FROM ""Deployments"" d2
                       JOIN ""Services"" s2 ON d2.""ServiceId"" = s2.""Id""
                       WHERE s2.""ProjectId"" = p.""Id""
                       ORDER BY d2.""StartedAt"" DESC, d2.""Id"" DESC
                       LIMIT 1
                   ) AS ""LatestDeploymentTime""
            FROM ""Projects"" p
            LEFT JOIN ""Services"" s ON p.""Id"" = s.""ProjectId""
            LEFT JOIN ""Deployments"" d ON s.""Id"" = d.""ServiceId""
            WHERE p.""IsArchived"" = FALSE
              AND (@isAdmin OR p.""OwnerId"" = @userId)
            GROUP BY p.""Id"", p.""PublicId"", p.""Name"", p.""OwnerId"", p.""CreatedAt""
            ORDER BY p.""CreatedAt"" DESC, p.""Id"" DESC;";
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("isAdmin", isAdmin);

        var list = new List<DashboardProjectEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new DashboardProjectEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                Name = reader.GetString(2),
                OwnerId = reader.GetInt32(3),
                CreatedAt = reader.GetDateTime(4),
                TotalDeployments = Convert.ToInt32(reader.GetInt64(5)),
                LatestStatus = reader.IsDBNull(6) ? null : reader.GetString(6),
                LatestDeploymentTime = reader.IsDBNull(7) ? null : reader.GetDateTime(7)
            });
        }
        return list;
    }

    public async Task<IReadOnlyList<DashboardDeploymentEntity>> GetDashboardRecentDeploymentsAsync(int userId, bool isAdmin, int limit = 10)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT d.""Id"", d.""PublicId"", d.""ServiceId"", d.""OwnerId"", d.""Environment"", d.""Version"",
                   d.""CommitSha"", d.""Status"", d.""StartedAt"", d.""CompletedAt"", d.""FailureReason"",
                   d.""WorkflowFile"", d.""WorkflowRef"", d.""TriggerError"", d.""WorkflowRunId"", d.""WorkflowRunUrl"",
                   p.""Name"" AS ""ProjectName"", s.""Name"" AS ""ServiceName"", s.""Type"" AS ""ServiceType"",
                   u.""Username"" AS ""UserName"", d.""CommitMessage"", p.""Id"" AS ""ProjectId""
            FROM ""Deployments"" d
            JOIN ""Services"" s ON d.""ServiceId"" = s.""Id""
            JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id""
            LEFT JOIN ""Users"" u ON d.""OwnerId"" = u.""Id""
            WHERE p.""IsArchived"" = FALSE
              AND (@isAdmin OR p.""OwnerId"" = @userId)
            ORDER BY d.""StartedAt"" DESC, d.""Id"" DESC
            LIMIT @limit;";
        command.Parameters.AddWithValue("userId", userId);
        command.Parameters.AddWithValue("isAdmin", isAdmin);
        command.Parameters.AddWithValue("limit", Math.Max(1, Math.Min(limit, 100)));

        var list = new List<DashboardDeploymentEntity>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(new DashboardDeploymentEntity
            {
                Id = reader.GetInt32(0),
                PublicId = reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                ServiceId = reader.GetInt32(2),
                OwnerId = reader.GetInt32(3),
                Environment = reader.GetString(4),
                Version = reader.GetString(5),
                CommitSha = reader.IsDBNull(6) ? null : reader.GetString(6),
                Status = reader.GetString(7),
                StartedAt = reader.GetDateTime(8),
                CompletedAt = reader.IsDBNull(9) ? null : reader.GetDateTime(9),
                FailureReason = reader.IsDBNull(10) ? null : reader.GetString(10),
                WorkflowFile = reader.IsDBNull(11) ? null : reader.GetString(11),
                WorkflowRef = reader.IsDBNull(12) ? null : reader.GetString(12),
                TriggerError = reader.IsDBNull(13) ? null : reader.GetString(13),
                WorkflowRunId = reader.IsDBNull(14) ? null : reader.GetInt64(14),
                WorkflowRunUrl = reader.IsDBNull(15) ? null : reader.GetString(15),
                ProjectName = reader.IsDBNull(16) ? null : reader.GetString(16),
                ServiceName = reader.IsDBNull(17) ? null : reader.GetString(17),
                ServiceType = reader.IsDBNull(18) ? null : reader.GetString(18),
                UserName = reader.IsDBNull(19) ? null : reader.GetString(19),
                CommitMessage = reader.IsDBNull(20) ? null : reader.GetString(20),
                ProjectId = reader.GetInt32(21)
            });
        }
        return list;
    }

    public async Task<DashboardMetricsEntity> GetDashboardMetricsAsync(int userId, bool isAdmin)
    {
        await using var connection = dbFactory.CreateConnection();
        await connection.OpenAsync();

        await using var projectCmd = connection.CreateCommand();
        projectCmd.CommandText = @"
            SELECT COUNT(1)
            FROM ""Projects""
            WHERE ""IsArchived"" = FALSE
              AND (@isAdmin OR ""OwnerId"" = @userId);";
        projectCmd.Parameters.AddWithValue("userId", userId);
        projectCmd.Parameters.AddWithValue("isAdmin", isAdmin);
        var totalProjects = Convert.ToInt32(await projectCmd.ExecuteScalarAsync());

        await using var deployCmd = connection.CreateCommand();
        deployCmd.CommandText = @"
            SELECT
                COUNT(1) AS ""TotalDeployments"",
                COUNT(1) FILTER (WHERE LOWER(d.""Status"") IN ('succeeded', 'ready')) AS ""SuccessfulDeployments"",
                COUNT(1) FILTER (WHERE LOWER(d.""Status"") IN ('running', 'pending', 'queued')) AS ""RunningDeployments"",
                COUNT(1) FILTER (WHERE LOWER(d.""Status"") IN ('failed', 'error')) AS ""FailedDeployments""
            FROM ""Deployments"" d
            JOIN ""Services"" s ON d.""ServiceId"" = s.""Id""
            JOIN ""Projects"" p ON s.""ProjectId"" = p.""Id""
            WHERE p.""IsArchived"" = FALSE
              AND (@isAdmin OR p.""OwnerId"" = @userId);";
        deployCmd.Parameters.AddWithValue("userId", userId);
        deployCmd.Parameters.AddWithValue("isAdmin", isAdmin);

        await using var reader = await deployCmd.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return new DashboardMetricsEntity
            {
                TotalProjects = totalProjects,
                TotalDeployments = Convert.ToInt32(reader.GetInt64(0)),
                SuccessfulDeployments = Convert.ToInt32(reader.GetInt64(1)),
                RunningDeployments = Convert.ToInt32(reader.GetInt64(2)),
                FailedDeployments = Convert.ToInt32(reader.GetInt64(3))
            };
        }

        return new DashboardMetricsEntity { TotalProjects = totalProjects };
    }
}
