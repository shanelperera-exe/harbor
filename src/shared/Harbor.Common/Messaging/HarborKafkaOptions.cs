using Confluent.Kafka;

namespace Harbor.Common.Messaging;

public sealed class HarborKafkaOptions
{
    public string BootstrapServers { get; set; } = string.Empty;
    public string DomainEventsTopic { get; set; } = Harbor.Contracts.Kafka.KafkaTopics.DomainEvents;
    public string DeploymentTopic { get; set; } = Harbor.Contracts.Kafka.KafkaTopics.DeploymentEvents;
    public string ConsumerGroupId { get; set; } = string.Empty;
    public string SaslUsername { get; set; } = string.Empty;
    public string SaslPassword { get; set; } = string.Empty;
    public string SecurityProtocol { get; set; } = "Plaintext";
    public string SaslMechanism { get; set; } = "Plain";
    public string ConnectionString { get; set; } = string.Empty;
    public string AutoOffsetReset { get; set; } = "Earliest";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(BootstrapServers);

    public static HarborKafkaOptions FromEnvironment(string defaultConsumerGroupId)
    {
        var options = new HarborKafkaOptions
        {
            BootstrapServers = Environment.GetEnvironmentVariable("KAFKA_BOOTSTRAP_SERVERS") ?? string.Empty,
            DomainEventsTopic = Environment.GetEnvironmentVariable("KAFKA_DOMAIN_EVENTS_TOPIC")
                ?? Harbor.Contracts.Kafka.KafkaTopics.DomainEvents,
            DeploymentTopic = Environment.GetEnvironmentVariable("KAFKA_DEPLOYMENT_TOPIC")
                ?? Harbor.Contracts.Kafka.KafkaTopics.DeploymentEvents,
            ConsumerGroupId = Environment.GetEnvironmentVariable("KAFKA_CONSUMER_GROUP_ID")
                ?? defaultConsumerGroupId,
            SaslUsername = Environment.GetEnvironmentVariable("KAFKA_SASL_USERNAME") ?? string.Empty,
            SaslPassword = Environment.GetEnvironmentVariable("KAFKA_SASL_PASSWORD") ?? string.Empty,
            SecurityProtocol = Environment.GetEnvironmentVariable("KAFKA_SECURITY_PROTOCOL") ?? "Plaintext",
            SaslMechanism = Environment.GetEnvironmentVariable("KAFKA_SASL_MECHANISM") ?? "Plain",
            ConnectionString = Environment.GetEnvironmentVariable("KAFKA_CONNECTION_STRING") ?? string.Empty,
            AutoOffsetReset = Environment.GetEnvironmentVariable("KAFKA_AUTO_OFFSET_RESET") ?? "Earliest"
        };

        options.ApplyConnectionString();
        return options;
    }

    public void ApplyConnectionString()
    {
        if (string.IsNullOrWhiteSpace(ConnectionString))
        {
            return;
        }

        var parts = ConnectionString.Split(';', StringSplitOptions.RemoveEmptyEntries);
        var dict = parts
            .Select(p => p.Split('=', 2))
            .Where(kv => kv.Length == 2)
            .ToDictionary(kv => kv[0].Trim(), kv => kv[1].Trim(), StringComparer.OrdinalIgnoreCase);

        if (dict.TryGetValue("Endpoint", out var endpoint))
        {
            var host = endpoint.Replace("sb://", "").Replace("https://", "").TrimEnd('/');
            BootstrapServers = $"{host}:9093";
        }

        SaslUsername = "$ConnectionString";
        SaslPassword = ConnectionString;

        if (dict.TryGetValue("EntityPath", out var entityPath))
        {
            DeploymentTopic = entityPath;
        }

        SecurityProtocol = "SaslSsl";
        SaslMechanism = "Plain";
    }

    public void ApplySecurity(ClientConfig config)
    {
        if (!string.IsNullOrWhiteSpace(SaslUsername) && !string.IsNullOrWhiteSpace(SaslPassword))
        {
            config.SecurityProtocol = Enum.Parse<SecurityProtocol>(SecurityProtocol);
            config.SaslMechanism = Enum.Parse<SaslMechanism>(SaslMechanism);
            config.SaslUsername = SaslUsername;
            config.SaslPassword = SaslPassword;
        }
    }
}
