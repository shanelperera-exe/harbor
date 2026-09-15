using Harbor.Environment.DTOs;

namespace Harbor.Environment.Services;

public interface IEnvironmentConfigurationService
{
    Task<(bool Success, string? Error, bool Forbidden, EnvironmentConfigurationResponse? Data)> GetAsync(
        int projectId, int environmentId, int userId, bool isAdmin);

    Task<(bool Success, string? Error, bool Forbidden, EnvironmentConfigurationResponse? Data)> ConfigureAsync(
        int projectId, int environmentId, ConfigureEnvironmentRequest request, int userId, bool isAdmin);
}