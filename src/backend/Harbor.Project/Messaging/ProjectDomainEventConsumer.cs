using System.Text.Json;
using Harbor.Common.Messaging;
using Harbor.Contracts.Kafka;
using Harbor.Project.Repositories;
using Microsoft.Extensions.Options;

namespace Harbor.Project.Messaging;

public sealed class ProjectDomainEventConsumer : KafkaConsumerBackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly HarborKafkaOptions _options;
    private readonly IHarborEventPublisher _eventPublisher;
    private readonly ILogger<ProjectDomainEventConsumer> _logger;

    public ProjectDomainEventConsumer(
        IOptions<HarborKafkaOptions> options,
        IServiceScopeFactory scopeFactory,
        IHarborEventPublisher eventPublisher,
        ILogger<ProjectDomainEventConsumer> logger)
        : base(options, logger)
    {
        _options = options.Value;
        _scopeFactory = scopeFactory;
        _eventPublisher = eventPublisher;
        _logger = logger;
    }

    protected override string Topic => _options.DomainEventsTopic;

    protected override async Task HandleMessageAsync(string key, string value, CancellationToken cancellationToken)
    {
        var envelope = JsonSerializer.Deserialize<DomainEventEnvelope>(value);
        if (envelope is null || envelope.EventType != DomainEventTypes.UserDeleted)
        {
            return;
        }

        var evt = JsonSerializer.Deserialize<UserDeletedEvent>(envelope.PayloadJson);
        if (evt is null)
        {
            return;
        }

        using var scope = _scopeFactory.CreateScope();
        var projectRepo = scope.ServiceProvider.GetRequiredService<IProjectRepository>();
        var deletedProjectIds = await projectRepo.DeleteByOwnerIdAsync(evt.UserId);

        foreach (var projectId in deletedProjectIds)
        {
            await _eventPublisher.PublishDomainEventAsync(
                DomainEventTypes.ProjectDeleted,
                projectId.ToString(),
                new ProjectDeletedEvent
                {
                    ProjectId = projectId,
                    OwnerId = evt.UserId,
                    DeletedAt = DateTime.UtcNow
                },
                cancellationToken);
        }

        _logger.LogInformation("Processed UserDeletedEvent for user {UserId}: deleted {Count} projects", evt.UserId, deletedProjectIds.Count);
    }
}
