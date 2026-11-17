namespace Harbor.Contracts.Kafka;

public class DeploymentLifecycleEvent
{
    public int DeploymentId { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string ServiceId { get; set; } = string.Empty;
    public int? ProjectId { get; set; }
    public string? ServiceName { get; set; }
    public string? ProjectName { get; set; }
    public int? OwnerId { get; set; }
    public string? OwnerEmail { get; set; }
    public string? OwnerName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Environment { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string? CommitSha { get; set; }
    public string? CommitMessage { get; set; }
    public string? WorkflowRunUrl { get; set; }
    public string? DeploymentUrl { get; set; }
    public DateTime Timestamp { get; set; }
    public string? FailureReason { get; set; }
}
