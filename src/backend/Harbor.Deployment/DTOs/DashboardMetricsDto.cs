namespace Harbor.Deployment.DTOs;

public sealed class DashboardMetricsDto
{
    public int TotalProjects { get; init; }
    public int TotalDeployments { get; init; }
    public int SuccessfulDeployments { get; init; }
    public int RunningDeployments { get; init; }
    public int FailedDeployments { get; init; }
}
