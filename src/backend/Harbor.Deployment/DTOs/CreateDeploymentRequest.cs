namespace Harbor.Deployment.DTOs;

public class CreateDeploymentRequest
{
    public int ProjectId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
}
