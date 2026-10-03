namespace Harbor.Deployment.Models;

public class DashboardMetricsEntity
{
    public int TotalProjects { get; init; }
    public int TotalDeployments { get; init; }
    public int SuccessfulDeployments { get; init; }
    public int RunningDeployments { get; init; }
    public int FailedDeployments { get; init; }
}
