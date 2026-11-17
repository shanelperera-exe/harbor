using System.Text.Json;
using Harbor.Common.Messaging;
using Harbor.Contracts.Kafka;
using Harbor.Deployment.Data;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Messaging;

public sealed class DeploymentDomainEventConsumer : KafkaConsumerBackgroundService
{
    private readonly DbConnectionFactory _dbFactory;
    private readonly HarborKafkaOptions _options;
    private readonly ILogger<DeploymentDomainEventConsumer> _logger;

    public DeploymentDomainEventConsumer(
        IOptions<HarborKafkaOptions> options,
        DbConnectionFactory dbFactory,
        ILogger<DeploymentDomainEventConsumer> logger)
        : base(options, logger)
    {
        _options = options.Value;
        _dbFactory = dbFactory;
        _logger = logger;
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
                    INSERT INTO "ServiceCatalogCache" ("ServiceId", "ProjectId", "ServiceName", "ProjectName", "OwnerId", "UpdatedAt")
                    VALUES (@serviceId, @projectId, @serviceName, @projectName, @ownerId, @updatedAt)
                    ON CONFLICT ("ServiceId") DO UPDATE SET
                        "ProjectId" = EXCLUDED."ProjectId",
                        "ServiceName" = EXCLUDED."ServiceName",
                        "ProjectName" = EXCLUDED."ProjectName",
                        "OwnerId" = EXCLUDED."OwnerId",
                        "UpdatedAt" = EXCLUDED."UpdatedAt";
                    """;
                cmd.Parameters.AddWithValue("serviceId", evt.ServiceId);
                cmd.Parameters.AddWithValue("projectId", evt.ProjectId);
                cmd.Parameters.AddWithValue("serviceName", evt.ServiceName);
                cmd.Parameters.AddWithValue("projectName", evt.ProjectName);
                cmd.Parameters.AddWithValue("ownerId", evt.OwnerId);
                cmd.Parameters.AddWithValue("updatedAt", evt.UpdatedAt);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.ServiceDeleted:
            {
                var evt = JsonSerializer.Deserialize<ServiceDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = """
                    DELETE FROM "CiRuns" WHERE "ServiceId" = @serviceId;
                    DELETE FROM "Deployments" WHERE "ServiceId" = @serviceId;
                    DELETE FROM "ServiceCatalogCache" WHERE "ServiceId" = @serviceId;
                    """;
                cmd.Parameters.AddWithValue("serviceId", evt.ServiceId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                _logger.LogInformation("Cleaned up deployments/CI runs for deleted service {ServiceId}", evt.ServiceId);
                break;
            }
            case DomainEventTypes.EnvironmentDeleted:
            {
                var evt = JsonSerializer.Deserialize<EnvironmentDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = """
                    DELETE FROM "Deployments" d
                    USING "ServiceCatalogCache" sc
                    WHERE d."ServiceId" = sc."ServiceId"
                      AND sc."ProjectId" = @projectId
                      AND d."Environment" = @envName;
                    """;
                cmd.Parameters.AddWithValue("projectId", evt.ProjectId);
                cmd.Parameters.AddWithValue("envName", evt.EnvironmentName);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.ProjectDeleted:
            {
                var evt = JsonSerializer.Deserialize<ProjectDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = """
                    DELETE FROM "Deployments" d
                    USING "ServiceCatalogCache" sc
                    WHERE d."ServiceId" = sc."ServiceId"
                      AND sc."ProjectId" = @projectId;
                    DELETE FROM "ServiceCatalogCache" WHERE "ProjectId" = @projectId;
                    """;
                cmd.Parameters.AddWithValue("projectId", evt.ProjectId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
            case DomainEventTypes.UserDeleted:
            {
                var evt = JsonSerializer.Deserialize<UserDeletedEvent>(envelope.PayloadJson);
                if (evt is null) return;

                await using var cmd = connection.CreateCommand();
                cmd.CommandText = """
                    DELETE FROM "CiRuns" WHERE "OwnerId" = @userId;
                    DELETE FROM "Deployments" WHERE "OwnerId" = @userId;
                    DELETE FROM "ServiceCatalogCache" WHERE "OwnerId" = @userId;
                    """;
                cmd.Parameters.AddWithValue("userId", evt.UserId);
                await cmd.ExecuteNonQueryAsync(cancellationToken);
                break;
            }
        }
    }
}
