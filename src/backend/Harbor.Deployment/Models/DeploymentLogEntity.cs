namespace Harbor.Deployment.Models;

public class DeploymentLogEntity
{
    public int Id { get; init; }
    public int DeploymentId { get; init; }
    public DateTime Timestamp { get; init; }
    public string Level { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
}
