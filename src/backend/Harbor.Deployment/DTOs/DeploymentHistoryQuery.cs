namespace Harbor.Deployment.DTOs;

public class DeploymentHistoryQuery
{
    public int? ServiceId { get; init; }
    public string? Status { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}
