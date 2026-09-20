using Harbor.Deployment.DTOs;

namespace Harbor.Deployment.Services;

public interface IDeploymentService
{
    Task<DeploymentListResponse> GetHistoryAsync(int ownerId, DeploymentHistoryQuery query);
    Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId);
    Task<(bool Success, string? Error, int? DeploymentId, string Status)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin);
    Task<bool> UpdateStatusAsync(int deploymentId, string status, string? failureReason);
}
