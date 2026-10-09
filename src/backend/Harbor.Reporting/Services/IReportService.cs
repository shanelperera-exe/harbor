using Harbor.Reporting.DTOs;

namespace Harbor.Reporting.Services;

public interface IReportService
{
    /// <summary>
    /// Generates a deployment report for the given user, applying the supplied filters.
    /// Admins may view all deployments; regular users are restricted to their own projects.
    /// </summary>
    Task<DeploymentReportResponse> GetDeploymentReportAsync(
        int userId,
        bool isAdmin,
        DeploymentReportQuery query);
}
