namespace Harbor.Deployment.DTOs;

public class DeploymentListResponse
{
    public IReadOnlyList<DeploymentResponse> Items { get; init; } = Array.Empty<DeploymentResponse>();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
}

public class DeploymentResponse
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public int ServiceId { get; init; }
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? WorkflowFile { get; init; }
    public string? WorkflowRef { get; init; }
}
