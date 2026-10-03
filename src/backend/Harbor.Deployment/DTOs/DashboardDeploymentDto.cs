namespace Harbor.Deployment.DTOs;

public sealed class DashboardDeploymentDto
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public string Hash { get; init; } = string.Empty;
    public int ServiceId { get; init; }
    public string? ServiceName { get; init; }
    public int ProjectId { get; init; }
    public string? ProjectName { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? CommitMessage { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? UserName { get; init; }
}
