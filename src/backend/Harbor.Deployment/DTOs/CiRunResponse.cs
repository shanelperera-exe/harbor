namespace Harbor.Deployment.DTOs;

public class CiRunQuery
{
    public string ServiceId { get; init; } = string.Empty;
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
}

public class CiRunListResponse
{
    public IReadOnlyList<CiRunResponse> Items { get; init; } = Array.Empty<CiRunResponse>();
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalCount { get; init; }
}

public class CiRunResponse
{
    public int Id { get; init; }
    public int ServiceId { get; init; }
    public string WorkflowName { get; init; } = string.Empty;
    public string WorkflowFile { get; init; } = string.Empty;
    public string Branch { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? Conclusion { get; init; }
    public string Status { get; init; } = string.Empty;
    public long GitHubRunId { get; init; }
    public string? GitHubRunUrl { get; init; }
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
}
