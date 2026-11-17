namespace Harbor.Contracts.Kafka;

public static class KafkaTopics
{
    public const string DeploymentEvents = "deployment-events";
    public const string DomainEvents = "harbor-domain-events";
}

public static class DomainEventTypes
{
    public const string UserDeleted = "user.deleted";
    public const string ProjectDeleted = "project.deleted";
    public const string ServiceUpdated = "service.updated";
    public const string ServiceDeleted = "service.deleted";
    public const string EnvironmentDeleted = "environment.deleted";
}

public sealed class DomainEventEnvelope
{
    public string EventType { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string PayloadJson { get; set; } = string.Empty;
}

public sealed class UserDeletedEvent
{
    public int UserId { get; set; }
    public string? PublicId { get; set; }
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ProjectDeletedEvent
{
    public int ProjectId { get; set; }
    public int OwnerId { get; set; }
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ServiceUpdatedEvent
{
    public int ServiceId { get; set; }
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? Provider { get; set; }
    public int OwnerId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public sealed class ServiceDeletedEvent
{
    public int ServiceId { get; set; }
    public int ProjectId { get; set; }
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
}

public sealed class EnvironmentDeletedEvent
{
    public int EnvironmentId { get; set; }
    public int ProjectId { get; set; }
    public string EnvironmentName { get; set; } = string.Empty;
    public DateTime DeletedAt { get; set; } = DateTime.UtcNow;
}
