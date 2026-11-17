using System.Text.Json;
using Confluent.Kafka;
using Harbor.Contracts.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Harbor.Common.Messaging;

public sealed class KafkaEventPublisher : IHarborEventPublisher, IDisposable
{
    private readonly HarborKafkaOptions _options;
    private readonly ILogger<KafkaEventPublisher> _logger;
    private readonly IProducer<string, string>? _producer;

    public KafkaEventPublisher(IOptions<HarborKafkaOptions> options, ILogger<KafkaEventPublisher> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (!_options.IsConfigured)
        {
            _logger.LogWarning("Kafka BootstrapServers is not configured. Domain events will not be published.");
            return;
        }

        try
        {
            var config = new ProducerConfig
            {
                BootstrapServers = _options.BootstrapServers,
                Acks = Acks.Leader,
                MessageSendMaxRetries = 3,
                BrokerAddressFamily = BrokerAddressFamily.V4
            };
            _options.ApplySecurity(config);
            _producer = new ProducerBuilder<string, string>(config).Build();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Kafka domain event producer.");
        }
    }

    public async Task PublishDomainEventAsync<T>(
        string eventType,
        string partitionKey,
        T payload,
        CancellationToken cancellationToken = default)
    {
        if (_producer is null || string.IsNullOrWhiteSpace(_options.DomainEventsTopic))
        {
            return;
        }

        try
        {
            var envelope = new DomainEventEnvelope
            {
                EventType = eventType,
                OccurredAt = DateTime.UtcNow,
                PayloadJson = JsonSerializer.Serialize(payload)
            };

            var message = new Message<string, string>
            {
                Key = partitionKey,
                Value = JsonSerializer.Serialize(envelope)
            };

            await _producer.ProduceAsync(_options.DomainEventsTopic, message, cancellationToken);
            _logger.LogInformation("Published domain event {EventType} with key {Key}", eventType, partitionKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish domain event {EventType} with key {Key}", eventType, partitionKey);
        }
    }

    public void Dispose()
    {
        _producer?.Flush(TimeSpan.FromSeconds(5));
        _producer?.Dispose();
    }
}
