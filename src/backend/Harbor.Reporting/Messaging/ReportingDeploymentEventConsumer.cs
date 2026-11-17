using System.Text.Json;
using Harbor.Common.Messaging;
using Harbor.Contracts.Kafka;
using Harbor.Reporting.Data;
using Microsoft.Extensions.Options;

namespace Harbor.Reporting.Messaging;

public sealed class ReportingDeploymentEventConsumer : KafkaConsumerBackgroundService
{
    private readonly ReportingDbConnectionFactory _dbFactory;
    private readonly HarborKafkaOptions _options;
    private readonly ILogger<ReportingDeploymentEventConsumer> _logger;

    public ReportingDeploymentEventConsumer(
        IOptions<HarborKafkaOptions> options,
        ReportingDbConnectionFactory dbFactory,
        ILogger<ReportingDeploymentEventConsumer> logger)
        : base(options, logger)
    {
        _options = options.Value;
        _dbFactory = dbFactory;
        _logger = logger;
    }

    protected override string Topic => _options.DeploymentTopic;

    protected override async Task HandleMessageAsync(string key, string value, CancellationToken cancellationToken)
    {
        var evt = JsonSerializer.Deserialize<DeploymentLifecycleEvent>(value);
        if (evt is null || evt.DeploymentId <= 0)
        {
            return;
        }

        _ = int.TryParse(evt.ServiceId, out var serviceId);
        var isCompleted = string.Equals(evt.Status, "succeeded", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(evt.Status, "failed", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(evt.Status, "ready", StringComparison.OrdinalIgnoreCase)
                          || string.Equals(evt.Status, "error", StringComparison.OrdinalIgnoreCase);

        await using var connection = _dbFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            INSERT INTO "DeploymentReadModels" (
                "Id", "PublicId", "ServiceId", "ProjectId", "OwnerId",
                "ProjectName", "ServiceName", "UserName",
                "Environment", "Version", "CommitSha", "CommitMessage",
                "Status", "StartedAt", "CompletedAt", "FailureReason"
            )
            VALUES (
                @id, @publicId, @serviceId, @projectId, @ownerId,
                @projectName, @serviceName, @userName,
                @environment, @version, @commitSha, @commitMessage,
                @status, @startedAt, @completedAt, @failureReason
            )
            ON CONFLICT ("Id") DO UPDATE SET
                "PublicId" = COALESCE(NULLIF(EXCLUDED."PublicId", ''), "DeploymentReadModels"."PublicId"),
                "ProjectId" = CASE WHEN EXCLUDED."ProjectId" > 0 THEN EXCLUDED."ProjectId" ELSE "DeploymentReadModels"."ProjectId" END,
                "OwnerId" = CASE WHEN EXCLUDED."OwnerId" > 0 THEN EXCLUDED."OwnerId" ELSE "DeploymentReadModels"."OwnerId" END,
                "ProjectName" = COALESCE(EXCLUDED."ProjectName", "DeploymentReadModels"."ProjectName"),
                "ServiceName" = COALESCE(EXCLUDED."ServiceName", "DeploymentReadModels"."ServiceName"),
                "UserName" = COALESCE(EXCLUDED."UserName", "DeploymentReadModels"."UserName"),
                "Status" = EXCLUDED."Status",
                "CompletedAt" = COALESCE(EXCLUDED."CompletedAt", "DeploymentReadModels"."CompletedAt"),
                "FailureReason" = COALESCE(EXCLUDED."FailureReason", "DeploymentReadModels"."FailureReason");
            """;
        cmd.Parameters.AddWithValue("id", evt.DeploymentId);
        cmd.Parameters.AddWithValue("publicId", evt.PublicId ?? string.Empty);
        cmd.Parameters.AddWithValue("serviceId", serviceId);
        cmd.Parameters.AddWithValue("projectId", evt.ProjectId ?? 0);
        cmd.Parameters.AddWithValue("ownerId", evt.OwnerId ?? 0);
        cmd.Parameters.AddWithValue("projectName", (object?)evt.ProjectName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("serviceName", (object?)evt.ServiceName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("userName", (object?)evt.OwnerName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("environment", evt.Environment ?? string.Empty);
        cmd.Parameters.AddWithValue("version", evt.Version ?? string.Empty);
        cmd.Parameters.AddWithValue("commitSha", (object?)evt.CommitSha ?? DBNull.Value);
        cmd.Parameters.AddWithValue("commitMessage", (object?)evt.CommitMessage ?? DBNull.Value);
        cmd.Parameters.AddWithValue("status", evt.Status ?? string.Empty);
        cmd.Parameters.AddWithValue("startedAt", evt.Timestamp == default ? DateTime.UtcNow : evt.Timestamp);
        cmd.Parameters.AddWithValue("completedAt", isCompleted ? (object)(evt.Timestamp == default ? DateTime.UtcNow : evt.Timestamp) : DBNull.Value);
        cmd.Parameters.AddWithValue("failureReason", (object?)evt.FailureReason ?? DBNull.Value);

        await cmd.ExecuteNonQueryAsync(cancellationToken);
        _logger.LogDebug("Upserted DeploymentReadModel {DeploymentId} ({Status})", evt.DeploymentId, evt.Status);
    }
}
