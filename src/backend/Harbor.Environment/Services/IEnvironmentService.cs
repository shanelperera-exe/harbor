using Harbor.Environment.DTOs;

namespace Harbor.Environment.Services;

public interface IEnvironmentService
{
    Task<(bool Success, string? Error, bool Forbidden, EnvironmentResponse? Data)> CreateAsync(string projectId, CreateEnvironmentRequest request, int userId, bool isAdmin);
    Task<(bool Success, string? Error, bool Forbidden, List<EnvironmentResponse>? Data)> GetByProjectAsync(string projectId, int userId, bool isAdmin);
    Task<(bool Success, string? Error, bool Forbidden, EnvironmentResponse? Data)> UpdateAsync(string projectId, int environmentId, UpdateEnvironmentRequest request, int userId, bool isAdmin);
    Task<(bool Success, string? Error, bool Forbidden, EnvironmentRemovalResponse? Data)> RemoveAsync(string projectId, int environmentId, int userId, bool isAdmin);
}
