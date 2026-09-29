namespace Harbor.Deployment.DTOs;

public class DeploymentHistoryQuery
{
    public string? ProjectId { get; init; }
    public string? Environment { get; init; }
    public string? ServiceId { get; init; }
    public string? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
