using Harbor.Reporting.DTOs;
using Harbor.Reporting.Repositories;

namespace Harbor.Reporting.Services;

/// <summary>
/// Implements deployment report generation for US-22.
///
/// Responsibilities:
///   • Delegates data retrieval to <see cref="IDeploymentReportRepository"/> (parameterized SQL).
///   • Computes aggregate statistics (AC6 – total, successful, failed, success rate; AC7 – average duration).
///   • Returns an empty-but-valid response when no records match (AC8).
/// </summary>
public class ReportService(IDeploymentReportRepository repository) : IReportService
{
    // Statuses that count as "successful" (mirrors DeploymentRepository in Harbor.Deployment)
    private static readonly HashSet<string> SuccessStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "succeeded", "ready" };

    // Statuses that count as "failed"
    private static readonly HashSet<string> FailureStatuses =
        new(StringComparer.OrdinalIgnoreCase) { "failed", "error" };

    public async Task<DeploymentReportResponse> GetDeploymentReportAsync(
        int userId,
        bool isAdmin,
        DeploymentReportQuery query)
    {
        // ── 1. Fetch rows ──────────────────────────────────────────────────────
        var rows = await repository.GetReportRowsAsync(
            userId,
            isAdmin,
            query.ProjectId?.Trim(),
            query.Environment?.Trim(),
            query.Status?.Trim(),
            query.StartDate,
            query.EndDate);

        // ── 2. Map to DTOs ─────────────────────────────────────────────────────
        var items = rows.Select(r => new DeploymentReportItem
        {
            Id              = r.Id,
            PublicId        = r.PublicId,
            Environment     = r.Environment,
            Version         = r.Version,
            CommitSha       = r.CommitSha,
            CommitMessage   = r.CommitMessage,
            Status          = r.Status,
            StartedAt       = r.StartedAt,
            CompletedAt     = r.CompletedAt,
            FailureReason   = r.FailureReason,
            ProjectName     = r.ProjectName,
            ServiceName     = r.ServiceName,
            UserName        = r.UserName,
            DurationSeconds = r.DurationSeconds,
        }).ToList();

        // ── 3. Compute statistics (AC6, AC7, AC8) ─────────────────────────────
        var statistics = ComputeStatistics(items);

        return new DeploymentReportResponse
        {
            AppliedFilters = query,
            Statistics     = statistics,
            Items          = items,
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /// <summary>
    /// Derives aggregate statistics from a list of already-mapped report items.
    /// When the list is empty, all counts are 0 and rate is 0 (AC8 – no misleading stats).
    /// AverageDurationSeconds is null when no completed deployments exist (AC7).
    /// </summary>
    public static DeploymentReportStatistics ComputeStatistics(IReadOnlyList<DeploymentReportItem> items)
    {
        var total      = items.Count;
        var successful = items.Count(i => SuccessStatuses.Contains(i.Status));
        var failed     = items.Count(i => FailureStatuses.Contains(i.Status));

        // AC6 – success rate: avoid division-by-zero when no deployments match (AC8).
        var successRate = total == 0
            ? 0.0
            : Math.Round(successful * 100.0 / total, 1);

        // AC7 – average duration over completed deployments only.
        var completedDurations = items
            .Where(i => i.DurationSeconds.HasValue)
            .Select(i => i.DurationSeconds!.Value)
            .ToList();

        double? avgDuration = completedDurations.Count == 0
            ? null
            : Math.Round(completedDurations.Average(), 2);

        return new DeploymentReportStatistics
        {
            TotalDeployments       = total,
            SuccessfulDeployments  = successful,
            FailedDeployments      = failed,
            SuccessRate            = successRate,
            AverageDurationSeconds = avgDuration,
        };
    }
}
