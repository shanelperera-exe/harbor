namespace Harbor.Reporting.DTOs;

// ── Request ────────────────────────────────────────────────────────────────────

/// <summary>Query parameters accepted by the deployment report endpoint (US-22).</summary>
public class DeploymentReportQuery
{
    /// <summary>Filter by project public-id or integer id string. Omit to include all projects.</summary>
    public string? ProjectId { get; init; }

    /// <summary>Filter by environment name (case-insensitive). Omit to include all environments.</summary>
    public string? Environment { get; init; }

    /// <summary>Filter by deployment status (case-insensitive). Omit to include all statuses.</summary>
    public string? Status { get; init; }

    /// <summary>Inclusive start date (UTC). Deployments that started on or after this date are included.</summary>
    public DateTime? StartDate { get; init; }

    /// <summary>Inclusive end date (UTC). Deployments that started on or before this date are included.</summary>
    public DateTime? EndDate { get; init; }
}

// ── Individual deployment row in the report ────────────────────────────────────

/// <summary>A single deployment row returned inside a <see cref="DeploymentReportResponse"/>.</summary>
public class DeploymentReportItem
{
    public int Id { get; init; }
    public string PublicId { get; init; } = string.Empty;
    public string Environment { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? CommitSha { get; init; }
    public string? CommitMessage { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime StartedAt { get; init; }
    public DateTime? CompletedAt { get; init; }
    public string? FailureReason { get; init; }
    public string? ProjectName { get; init; }
    public string? ServiceName { get; init; }
    public string? UserName { get; init; }

    /// <summary>Duration in seconds; null when the deployment has not yet completed.</summary>
    public double? DurationSeconds { get; init; }
}

// ── Statistics ─────────────────────────────────────────────────────────────────

/// <summary>Aggregate statistics derived from the report's deployment rows (AC6, AC7, AC8).</summary>
public class DeploymentReportStatistics
{
    /// <summary>Total number of deployments matching the applied filters.</summary>
    public int TotalDeployments { get; init; }

    /// <summary>Count of deployments whose status is succeeded or ready.</summary>
    public int SuccessfulDeployments { get; init; }

    /// <summary>Count of deployments whose status is failed or error.</summary>
    public int FailedDeployments { get; init; }

    /// <summary>
    /// Deployment success rate as a percentage (0–100), rounded to one decimal place.
    /// Returns 0 when <see cref="TotalDeployments"/> is 0 (AC8 – no misleading statistics).
    /// </summary>
    public double SuccessRate { get; init; }

    /// <summary>
    /// Average duration in seconds across completed deployments.
    /// Null when no deployments have completed (AC7 – sufficient timing information).
    /// </summary>
    public double? AverageDurationSeconds { get; init; }
}

// ── Top-level response ─────────────────────────────────────────────────────────

/// <summary>Full response returned by GET /api/reports/deployments (US-22).</summary>
public class DeploymentReportResponse
{
    /// <summary>The filters that were applied to produce this report.</summary>
    public DeploymentReportQuery AppliedFilters { get; init; } = new();

    /// <summary>Aggregate statistics for the matched deployments.</summary>
    public DeploymentReportStatistics Statistics { get; init; } = new();

    /// <summary>The individual deployment rows matching the applied filters.</summary>
    public IReadOnlyList<DeploymentReportItem> Items { get; init; } = Array.Empty<DeploymentReportItem>();
}
