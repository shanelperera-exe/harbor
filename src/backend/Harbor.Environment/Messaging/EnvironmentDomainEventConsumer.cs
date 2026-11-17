using System.Text.Json;
using Harbor.Common.Messaging;
using Harbor.Contracts.Kafka;
using Harbor.Environment.Repositories;
using Microsoft.Extensions.Options;

namespace Harbor.Environment.Messaging;

public sealed class EnvironmentDomainEventConsumer : KafkaConsumerBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly HarborKafkaOptions _options;
    private readonly ILogger<EnvironmentDomainEventConsumer> _logger;

    public EnvironmentDomainEventConsumer(
        IOptions<HarborKafkaOptions> options,
        IServiceScopeFactory scopeFactory,
        ILogger<EnvironmentDomainEventConsumer> logger)
        : base(options, logger)
    {
        _options = options.Value;
        _scopeFactory = scopeFactory;
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

        if (envelope.EventType == DomainEventTypes.ProjectDeleted)
        {
            var evt = JsonSerializer.Deserialize<ProjectDeletedEvent>(envelope.PayloadJson);
            if (evt is null)
            {
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IEnvironmentRepository>();
            var deleted = await repo.DeleteByProjectIdAsync(evt.ProjectId);
            _logger.LogInformation("Processed ProjectDeletedEvent for project {ProjectId}: removed {Count} environments", evt.ProjectId, deleted);
        }
    }
}
