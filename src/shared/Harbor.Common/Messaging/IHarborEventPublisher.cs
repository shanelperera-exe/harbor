namespace Harbor.Common.Messaging;

public interface IHarborEventPublisher
{
    Task PublishDomainEventAsync<T>(string eventType, string partitionKey, T payload, CancellationToken cancellationToken = default);
}

public sealed class NoOpHarborEventPublisher : IHarborEventPublisher
{
    public Task PublishDomainEventAsync<T>(string eventType, string partitionKey, T payload, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
