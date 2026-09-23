using Harbor.Deployment.DTOs;

namespace Harbor.Deployment.Services;

public interface IDeploymentService
{
    Task<DeploymentListResponse> GetHistoryAsync(int ownerId, DeploymentHistoryQuery query);
    Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId);
    Task<(bool Success, string? Error, int? DeploymentId, string Status, string? CiWarning)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin);
    Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason);
    Task<CiRunListResponse> GetCiRunsAsync(int ownerId, string serviceId, int page, int pageSize);
    Task<(bool Success, string? Error, int? DeploymentId, string Status, string? CiWarning)> RedeployAsync(int sourceDeploymentId, int ownerId, bool isAdmin);
}
