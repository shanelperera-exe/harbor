using System.Text.Json;
using Harbor.Common.Messaging;
using Harbor.Contracts.Kafka;
using Harbor.Reporting.Data;
using Microsoft.Extensions.Options;

namespace Harbor.Reporting.Messaging;

public sealed class ReportingDomainEventConsumer : KafkaConsumerBackgroundService
{
    private readonly ReportingDbConnectionFactory _dbFactory;
    private readonly HarborKafkaOptions _options;

    public ReportingDomainEventConsumer(
        IOptions<HarborKafkaOptions> options,
        ReportingDbConnectionFactory dbFactory,
        ILogger<ReportingDomainEventConsumer> logger)
        : base(options, logger)
    {
        _options = options.Value;
        _dbFactory = dbFactory;
    }

    protected override string Topic => _options.DomainEventsTopic;

    protected override async Task HandleMessageAsync(string key, string value, CancellationToken cancellationToken)
    {
        var envelope = JsonSerializer.Deserialize<DomainEventEnvelope>(value);
        if (envelope is null)
        {
            return;
        }

        await using var connection = _dbFactory.CreateConnection();
        await connection.OpenAsync(cancellationToken);

        switch (envelope.EventType)
        {
            case DomainEventTypes.ServiceUpdated:
            {
                var evt = JsonSerializer.Deserialize<ServiceUpdatedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = """
                    UPDATE "DeploymentReadModels"
                    SET "ProjectId" = @projectId,
                        "ProjectName" = @projectName,
                        "ServiceName" = @serviceName,
                        "OwnerId" = @ownerId
                    WHERE "ServiceId" = @serviceId;
                    """;
                cmd.Parameters.AddWithValue("serviceId", evt.ServiceId);
                cmd.Parameters.AddWithValue("projectId", evt.ProjectId);
                cmd.Parameters.AddWithValue("projectName", evt.ProjectName);
                cmd.Parameters.AddWithValue("serviceName", evt.ServiceName);
                cmd.Parameters.AddWithValue("ownerId", evt.OwnerId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.ServiceDeleted:
            {
                var evt = JsonSerializer.Deserialize<ServiceDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = "DELETE FROM \"DeploymentReadModels\" WHERE \"ServiceId\" = @serviceId;";
                cmd.Parameters.AddWithValue("serviceId", evt.ServiceId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.ProjectDeleted:
            {
                var evt = JsonSerializer.Deserialize<ProjectDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = "DELETE FROM \"DeploymentReadModels\" WHERE \"ProjectId\" = @projectId;";
                cmd.Parameters.AddWithValue("projectId", evt.ProjectId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.UserDeleted:
            {
                var evt = JsonSerializer.Deserialize<UserDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = "DELETE FROM \"DeploymentReadModels\" WHERE \"OwnerId\" = @userId;";
                cmd.Parameters.AddWithValue("userId", evt.UserId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
        }
    }
}
