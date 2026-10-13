namespace Harbor.Deployment.Models;

public class NotificationEntity
{
    public int Id { get; init; }
    public int UserId { get; init; }
    public int DeploymentId { get; init; }

    /// <summary>"success" or "failure"</summary>
    public string Type { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public bool IsRead { get; init; }
    public DateTime CreatedAt { get; init; }

    // Joined — populated by queries that JOIN Deployments
    public string? Environment { get; init; }
    public string? ServiceName { get; init; }
    public string? ProjectName { get; init; }
    public string? Version { get; init; }
}
