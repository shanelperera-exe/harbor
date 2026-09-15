namespace Harbor.Deployment.DTOs;

public class CreateDeploymentResponse
{
    public int Id { get; init; }
    public int ProjectId { get; init; }
    public int OwnerId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
}
