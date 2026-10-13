namespace Harbor.Deployment.DTOs;

public sealed class DashboardSummaryResponse
{
    public IReadOnlyList<DashboardProjectDto> Projects { get; init; } = Array.Empty<DashboardProjectDto>();
    public IReadOnlyList<DashboardDeploymentDto> RecentDeployments { get; init; } = Array.Empty<DashboardDeploymentDto>();
    public DashboardMetricsDto Metrics { get; init; } = new();
}
