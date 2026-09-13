using Harbor.Environment.DTOs;

namespace Harbor.Environment.Services;

public interface IEnvironmentService
{
    Task<(bool Success, string? Error, bool Forbidden, EnvironmentResponse? Data)> CreateAsync(int projectId, CreateEnvironmentRequest request, int userId, bool isAdmin);
    Task<(bool Success, string? Error, bool Forbidden, List<EnvironmentResponse>? Data)> GetByProjectAsync(int projectId, int userId, bool isAdmin);
}
