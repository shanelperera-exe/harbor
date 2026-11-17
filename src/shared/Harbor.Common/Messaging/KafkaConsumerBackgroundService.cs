using Confluent.Kafka;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Harbor.Common.Messaging;

public abstract class KafkaConsumerBackgroundService : BackgroundService
{
    private readonly HarborKafkaOptions _options;
    private readonly ILogger _logger;

    protected KafkaConsumerBackgroundService(IOptions<HarborKafkaOptions> options, ILogger logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    protected abstract string Topic { get; }
    protected abstract Task HandleMessageAsync(string key, string value, CancellationToken cancellationToken);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.IsConfigured || string.IsNullOrWhiteSpace(Topic))
        {
            _logger.LogWarning("Kafka is not configured for topic {Topic}. Consumer will not start.", Topic);
            return;
        }

        await Task.Yield();

        var config = new ConsumerConfig
        {
            BootstrapServers = _options.BootstrapServers,
            GroupId = _options.ConsumerGroupId,
            AutoOffsetReset = Enum.TryParse<AutoOffsetReset>(_options.AutoOffsetReset, true, out var reset)
                ? reset
                : AutoOffsetReset.Earliest,
            EnableAutoCommit = true,
            BrokerAddressFamily = BrokerAddressFamily.V4
        };
        _options.ApplySecurity(config);

        using var consumer = new ConsumerBuilder<string, string>(config).Build();
        consumer.Subscribe(Topic);
        _logger.LogInformation("Kafka consumer subscribed to {Topic} (group {GroupId})", Topic, _options.ConsumerGroupId);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(TimeSpan.FromMilliseconds(500));
                    if (result?.Message is null)
                    {
                        continue;
                    }

                    await HandleMessageAsync(result.Message.Key ?? string.Empty, result.Message.Value, stoppingToken);
                }
                catch (ConsumeException ex) when (ex.Error.Code == ErrorCode.UnknownTopicOrPart)
                {
                    // Topic may not exist yet until first publish; wait briefly before retrying.
                    await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing Kafka message on topic {Topic}", Topic);
                    await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                }
            }
        }
        finally
        {
            consumer.Close();
        }
    }
}
