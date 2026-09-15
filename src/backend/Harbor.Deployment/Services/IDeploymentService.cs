using Harbor.Deployment.DTOs;

namespace Harbor.Deployment.Services;

public interface IDeploymentService
{
    Task<DeploymentListResponse> GetHistoryAsync(int ownerId, DeploymentHistoryQuery query);
    Task<DeploymentDetailsResponse?> GetDetailsAsync(int id, int ownerId);
    Task<(bool Success, string? Error, int? DeploymentId)> CreateAsync(CreateDeploymentRequest request, int ownerId, bool isAdmin);
}
