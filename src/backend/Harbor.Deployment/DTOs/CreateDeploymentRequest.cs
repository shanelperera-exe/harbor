namespace Harbor.Deployment.DTOs;

public class CreateDeploymentRequest
{
    public string ServiceId { get; init; } = string.Empty;
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? Branch { get; init; }
    /// <summary>When true, bypass the CI gate check and deploy even if CI is failing.</summary>
    public bool OverrideCiGate { get; init; }
}
