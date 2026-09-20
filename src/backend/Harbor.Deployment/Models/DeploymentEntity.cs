namespace Harbor.Deployment.Models;

public class DeploymentEntity
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public int ServiceId { get; init; }
    public int OwnerId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? FailureReason { get; init; }
}
