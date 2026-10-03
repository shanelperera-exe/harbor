namespace Harbor.Deployment.DTOs;

public sealed class DashboardProjectDto
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string? RepositoryUrl { get; init; }
    public int OwnerId { get; init; }
    public DateTime CreatedAt { get; init; }
    public int TotalDeployments { get; init; }
    public string? LatestStatus { get; init; }
    public DateTime? LatestDeploymentTime { get; init; }
}
