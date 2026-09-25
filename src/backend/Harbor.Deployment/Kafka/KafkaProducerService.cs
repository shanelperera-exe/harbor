using Confluent.Kafka;
using Harbor.Contracts.Kafka;
using Microsoft.Extensions.Options;
using System.Text.Json;

namespace Harbor.Deployment.Kafka;

public class KafkaProducerService : IKafkaProducerService, IDisposable
{
    private readonly KafkaOptions options;
    private readonly ILogger<KafkaProducerService> logger;
    private readonly IProducer<string, string>? producer;

    public KafkaProducerService(IOptions<KafkaOptions> options, ILogger<KafkaProducerService> logger)
    {
        this.options = options.Value;
        this.logger = logger;

        if (string.IsNullOrWhiteSpace(this.options.BootstrapServers))
        {
            logger.LogWarning("Kafka BootstrapServers is not configured. Kafka events will not be published.");
            return;
        }

        try
        {
            var config = new ProducerConfig
            {
                BootstrapServers = this.options.BootstrapServers,
                Acks = Acks.Leader,
                MessageSendMaxRetries = 3
            };

            producer = new ProducerBuilder<string, string>(config).Build();
            logger.LogInformation("Kafka producer initialized with servers: {Servers}", this.options.BootstrapServers);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to initialize Kafka producer.");
        }
    }

    public async Task PublishDeploymentEventAsync(DeploymentLifecycleEvent @event)
    {
        if (producer == null || string.IsNullOrWhiteSpace(options.DeploymentTopic))
        {
            return;
        }

        try
        {
            var message = new Message<string, string>
            {
                Key = @event.DeploymentId.ToString(),
                Value = JsonSerializer.Serialize(@event)
            };

            var deliveryResult = await producer.ProduceAsync(options.DeploymentTopic, message);
            logger.LogInformation("Published deployment event for ID {DeploymentId} to partition {Partition} at offset {Offset}", 
                @event.DeploymentId, deliveryResult.Partition, deliveryResult.Offset);
        }
        catch (ProduceException<string, string> ex)
        {
            logger.LogError(ex, "Kafka delivery failed for deployment {DeploymentId}. Reason: {Reason}", @event.DeploymentId, ex.Error.Reason);
            // Do not throw the exception to prevent application crash
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An unexpected error occurred while publishing deployment event {DeploymentId}", @event.DeploymentId);
            // Do not throw the exception to prevent application crash
        }
    }

    public void Dispose()
    {
        producer?.Flush(TimeSpan.FromSeconds(10));
        producer?.Dispose();
    }
}
