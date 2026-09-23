namespace Harbor.Deployment.DTOs;

public class CreateDeploymentResponse
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public string ServiceId { get; init; } = string.Empty;
    public int OwnerId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public string? FailureReason { get; init; }
    /// <summary>Set when the CI gate blocked deployment. Frontend should show a "CI is failing — deploy anyway?" prompt.</summary>
    public string? CiWarning { get; init; }
    /// <summary>Direct link to the GitHub Actions run for this deployment.</summary>
    public string? WorkflowRunUrl { get; init; }
}
