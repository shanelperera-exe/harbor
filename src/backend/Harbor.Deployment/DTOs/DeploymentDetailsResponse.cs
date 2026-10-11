namespace Harbor.Deployment.DTOs;

public class DeploymentDetailsResponse : DeploymentResponse
{
    public string? FailureReason { get; init; }
    public string? TriggerError { get; init; }
    public string? WorkflowRunUrl { get; init; }
    public IReadOnlyList<DeploymentLogResponse> Logs { get; init; } = Array.Empty<DeploymentLogResponse>();
}

public class DeploymentLogResponse
{
    public DateTime Timestamp { get; init; }
    public string Level { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
}
