using Harbor.Reporting.Models;

namespace Harbor.Reporting.Repositories;

/// <summary>
/// Data-access contract for the deployment reporting feature (US-22).
/// All queries use parameterized SQL — no string concatenation of user input.
/// </summary>
public interface IDeploymentReportRepository
{
    /// <summary>
    /// Returns all deployment rows that match the supplied filters.
    /// Any null/empty filter parameter is treated as "no restriction on that column".
    /// </summary>
    Task<IReadOnlyList<DeploymentReportEntity>> GetReportRowsAsync(
        int userId,
        bool isAdmin,
        string? projectId,
        string? environment,
        string? status,
        DateTime? startDate,
        DateTime? endDate);
}
