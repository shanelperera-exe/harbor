namespace Harbor.Deployment.Models;

/// <summary>
/// Read-only record of a CI workflow run (any workflow that is NOT the deploy workflow).
/// Lets users see CI history inside Harbor for push-triggered runs.
/// </summary>
public class CiRunEntity
{
    public int Id { get; init; }
    public int ServiceId { get; init; }
    public int OwnerId { get; init; }
    public string WorkflowName { get; init; } = string.Empty;
    public string WorkflowFile { get; init; } = string.Empty;
    public string Branch { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? Conclusion { get; init; }
    public string Status { get; init; } = string.Empty;
    public long GitHubRunId { get; init; }
    public string? GitHubRunUrl { get; init; }
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}