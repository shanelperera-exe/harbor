namespace Harbor.Deployment.DTOs;

public class CreateDeploymentRequest
{
    public string ServiceId { get; init; } = string.Empty;
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
}
