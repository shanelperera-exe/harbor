namespace Harbor.Reporting.Models;

/// <summary>Represents a single deployment row returned by the deployment report query.</summary>
public class DeploymentReportEntity
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? CommitMessage { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? FailureReason { get; init; }

    // Joined properties
    public string? ProjectName { get; init; }
    public string? ServiceName { get; init; }
    public string? UserName { get; init; }

    /// <summary>Duration in seconds; null when the deployment has not yet completed.</summary>
    public double? DurationSeconds =>
        CompletedAt.HasValue
            ? (CompletedAt.Value - StartedAt).TotalSeconds
            : null;
}
