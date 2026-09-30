namespace Harbor.Deployment.Kafka;

public class KafkaOptions
{
    public string BootstrapServers { get; set; } = string.Empty;
    public string DeploymentTopic { get; set; } = string.Empty;
    public string ConsumerGroupId { get; set; } = "harbor-deployment-group";
    public string SaslUsername { get; set; } = string.Empty;
    public string SaslPassword { get; set; } = string.Empty;
    public string SecurityProtocol { get; set; } = "Plaintext";
    public string SaslMechanism { get; set; } = "Plain";
    public string ConnectionString { get; set; } = string.Empty;
    public string AutoOffsetReset { get; set; } = "Latest";

    public void ApplyConnectionString()
    {
        // Priority 1: Connection string (Azure Event Hubs)
        if (!string.IsNullOrWhiteSpace(ConnectionString))
        {
            ApplyEventHubsConnectionString();
            return;
        }

        // Priority 2: Individual settings (local Kafka, Confluent Cloud, etc.)
        // BootstrapServers, DeploymentTopic, SaslUsername, SaslPassword, SecurityProtocol, SaslMechanism
        // are expected to be set directly via config binding
    }

    private void ApplyEventHubsConnectionString()
    {
        // Parse Event Hubs connection string:
        // Endpoint=sb://namespace.servicebus.windows.net/;SharedAccessKeyName=policy;SharedAccessKey=key;EntityPath=topic
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

        // Azure Event Hubs Kafka authentication requires the literal username "$ConnectionString"
        // and the full connection string as the password. Using just the SharedAccessKeyName /
        // SharedAccessKey is incorrect and causes "Invalid SASL PLAIN user name" rejections.
        SaslUsername = "$ConnectionString";
        SaslPassword = ConnectionString;

        if (dict.TryGetValue("EntityPath", out var entityPath))
            DeploymentTopic = entityPath;

        // Event Hubs always uses SASL_SSL
        SecurityProtocol = "SaslSsl";
        SaslMechanism = "Plain";
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(BootstrapServers) && !string.IsNullOrWhiteSpace(DeploymentTopic);
}
