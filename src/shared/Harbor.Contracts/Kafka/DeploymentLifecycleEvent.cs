namespace Harbor.Contracts.Kafka;

public class DeploymentLifecycleEvent
{
    public int DeploymentId { get; set; }
    public string ServiceId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string? FailureReason { get; set; }
}
