using System.Text.Json;
using Confluent.Kafka;
using Harbor.Contracts.Kafka;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;

namespace Harbor.Deployment.Kafka;

public class KafkaConsumerService : BackgroundService
{
    private readonly KafkaOptions _options;
    private readonly ILogger<KafkaConsumerService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public KafkaConsumerService(
        IOptions<KafkaOptions> options,
        ILogger<KafkaConsumerService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _options = options.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_options.BootstrapServers) ||
            string.IsNullOrWhiteSpace(_options.DeploymentTopic) ||
            string.IsNullOrWhiteSpace(_options.ConsumerGroupId))
        {
            _logger.LogWarning("Kafka configuration is incomplete. Skipping KafkaConsumerService.");
            return;
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.ConsumerGroupId,
            AutoOffsetReset = AutoOffsetReset.Earliest,
            EnableAutoCommit = false,
            BrokerAddressFamily = BrokerAddressFamily.V4
        };

        using var consumer = new ConsumerBuilder<Ignore, string>(config).Build();
        consumer.Subscribe(_options.DeploymentTopic);

        _logger.LogInformation("KafkaConsumerService started for topic {Topic} and group {GroupId}", _options.DeploymentTopic, _options.ConsumerGroupId);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var consumeResult = consumer.Consume(stoppingToken);

                    if (consumeResult.Message != null)
                    {
                        var eventJson = consumeResult.Message.Value;
                        await ProcessEventAsync(eventJson, stoppingToken);

                        // Commit only after successful processing
                        consumer.Commit(consumeResult);
                    }
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming Kafka message");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("KafkaConsumerService cancellation requested.");
        }
        finally
        {
            consumer.Close();
        }
    }

    internal async Task ProcessEventAsync(string eventJson, CancellationToken stoppingToken)
    {
        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var deploymentEvent = JsonSerializer.Deserialize<DeploymentLifecycleEvent>(eventJson, options);

            if (deploymentEvent == null)
            {
                _logger.LogWarning("Deserialized deployment event was null.");
                return;
            }

            if (deploymentEvent.DeploymentId <= 0)
            {
                _logger.LogWarning("Deployment event missing valid DeploymentId. Payload: {Payload}", eventJson);
                return;
            }

            using var scope = _scopeFactory.CreateScope();
            var deploymentRepository = scope.ServiceProvider.GetRequiredService<IDeploymentRepository>();

            var deployment = await deploymentRepository.GetEntityByIdAsync(deploymentEvent.DeploymentId);
            if (deployment == null)
            {
                _logger.LogWarning("Deployment not found for ID {DeploymentId}. Skipping event.", deploymentEvent.DeploymentId);
                return;
            }

            var newState = DetermineNewState(deployment.Status, deploymentEvent.Status);
            if (newState != null)
            {
                _logger.LogInformation("Transitioning Deployment {DeploymentId} from {OldStatus} to {NewStatus}",
                    deploymentEvent.DeploymentId, deployment.Status, newState);
                
                await deploymentRepository.UpdateStatusAsync(deploymentEvent.DeploymentId, newState, deploymentEvent.FailureReason);
            }
            else
            {
                _logger.LogInformation("Ignoring event for Deployment {DeploymentId}: invalid or duplicate transition from {OldStatus} to {RequestedStatus}.",
                    deploymentEvent.DeploymentId, deployment.Status, deploymentEvent.Status);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing deployment event. Payload: {Payload}", eventJson);
        }
    }

    internal string? DetermineNewState(string currentStatus, string eventStatus)
    {
        if (currentStatus == "Successful" || currentStatus == "Failed")
        {
            return null; // Terminal state, cannot transition further
        }

        if (currentStatus == "Running" && eventStatus == "DeploymentStarted")
        {
            return null; // Already running
        }

        return eventStatus switch
        {
            "DeploymentStarted" => "Running",
            "DeploymentSucceeded" => "Successful",
            "DeploymentFailed" => "Failed",
            _ => null // Unknown event status
        };
    }
}
