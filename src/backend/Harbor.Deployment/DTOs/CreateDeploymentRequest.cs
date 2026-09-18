namespace Harbor.Deployment.DTOs;

public class CreateDeploymentRequest
{
    public int ServiceId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
}
