namespace Harbor.Deployment.Kafka;

public class KafkaOptions
{
    public string BootstrapServers { get; set; } = string.Empty;
    public string DeploymentTopic { get; set; } = string.Empty;
}
