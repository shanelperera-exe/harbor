using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Repositories;

namespace Harbor.Environment.Services;

public class EnvironmentService(IEnvironmentRepository environmentRepository) : IEnvironmentService
{
    private static readonly string[] SupportedTypes = ["Development", "Staging", "Production"];

    public async Task<(bool Success, string? Error, bool Forbidden, EnvironmentResponse? Data)> CreateAsync(int projectId, CreateEnvironmentRequest request, int userId, bool isAdmin)
    {
        var access = await environmentRepository.GetProjectAccessAsync(projectId);
        if (!access.Exists || access.IsArchived) return (false, "Project not found or archived.", false, null);
        if (!isAdmin && access.OwnerId != userId) return (false, "You do not have permission to manage this project's environments.", true, null);
        if (string.IsNullOrWhiteSpace(request.Name)) return (false, "Environment name is required.", false, null);
        var name = request.Name.Trim();
        if (name.Length > 100) return (false, "Environment name cannot exceed 100 characters.", false, null);
        var type = SupportedTypes.FirstOrDefault(t => string.Equals(t, request.Type?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (type is null) return (false, "Environment type must be Development, Staging, or Production.", false, null);
        if (await environmentRepository.TypeExistsForProjectAsync(projectId, type)) return (false, $"A {type} environment already exists for this project.", false, null);

        var environment = new EnvironmentEntity { ProjectId = projectId, Name = name, Type = type, CreatedAt = DateTime.UtcNow };
        environment.Id = await environmentRepository.CreateAsync(environment);
        return (true, null, false, ToResponse(environment));
    }

    public async Task<(bool Success, string? Error, bool Forbidden, List<EnvironmentResponse>? Data)> GetByProjectAsync(int projectId, int userId, bool isAdmin)
    {
        var access = await environmentRepository.GetProjectAccessAsync(projectId);
        if (!access.Exists || access.IsArchived) return (false, "Project not found or archived.", false, null);
        if (!isAdmin && access.OwnerId != userId) return (false, "You do not have permission to view this project's environments.", true, null);
        return (true, null, false, (await environmentRepository.GetByProjectIdAsync(projectId)).Select(ToResponse).ToList());
    }

    public async Task<(bool Success, string? Error, bool Forbidden, EnvironmentResponse? Data)> UpdateAsync(int projectId, int environmentId, UpdateEnvironmentRequest request, int userId, bool isAdmin)
    {
        var access = await AuthorizeManagementAsync(projectId, userId, isAdmin);
        if (!access.Success) return (false, access.Error, access.Forbidden, null);

        var environment = await environmentRepository.GetByIdAsync(environmentId, projectId);
        if (environment is null || !environment.IsActive) return (false, "Environment not found or inactive.", false, null);
        if (string.IsNullOrWhiteSpace(request.Name)) return (false, "Environment name is required.", false, null);
        var name = request.Name.Trim();
        if (name.Length > 100) return (false, "Environment name cannot exceed 100 characters.", false, null);
        var type = SupportedTypes.FirstOrDefault(t => string.Equals(t, request.Type?.Trim(), StringComparison.OrdinalIgnoreCase));
        if (type is null) return (false, "Environment type must be Development, Staging, or Production.", false, null);
        if (!string.Equals(name, environment.Name, StringComparison.Ordinal) && await environmentRepository.HasDeploymentHistoryAsync(projectId, environment.Name))
            return (false, "An environment with deployment history cannot be renamed because historical records retain its name.", false, null);
        if (await environmentRepository.TypeExistsForProjectAsync(projectId, type, environmentId)) return (false, $"A {type} environment already exists for this project.", false, null);

        environment.Name = name;
        environment.Type = type;
        if (!await environmentRepository.UpdateAsync(environment)) return (false, "Environment could not be updated.", false, null);
        return (true, null, false, ToResponse(environment));
    }

    public async Task<(bool Success, string? Error, bool Forbidden, EnvironmentRemovalResponse? Data)> RemoveAsync(int projectId, int environmentId, int userId, bool isAdmin)
    {
        var access = await AuthorizeManagementAsync(projectId, userId, isAdmin);
        if (!access.Success) return (false, access.Error, access.Forbidden, null);

        var environment = await environmentRepository.GetByIdAsync(environmentId, projectId);
        if (environment is null || !environment.IsActive) return (false, "Environment not found or inactive.", false, null);
        if (await environmentRepository.HasDeploymentHistoryAsync(projectId, environment.Name))
        {
            if (!await environmentRepository.DeactivateAsync(environmentId, projectId, DateTime.UtcNow)) return (false, "Environment could not be deactivated.", false, null);
            return (true, null, false, new EnvironmentRemovalResponse { Deactivated = true, Message = "Environment was deactivated because deployment history must be retained." });
        }

        if (!await environmentRepository.DeleteAsync(environmentId, projectId)) return (false, "Environment could not be removed.", false, null);
        return (true, null, false, new EnvironmentRemovalResponse { Deactivated = false, Message = "Environment was removed." });
    }

    private async Task<(bool Success, string? Error, bool Forbidden)> AuthorizeManagementAsync(int projectId, int userId, bool isAdmin)
    {
        var access = await environmentRepository.GetProjectAccessAsync(projectId);
        if (!access.Exists || access.IsArchived) return (false, "Project not found or archived.", false);
        if (!isAdmin && access.OwnerId != userId) return (false, "You do not have permission to manage this project's environments.", true);
        return (true, null, false);
    }

    private static EnvironmentResponse ToResponse(EnvironmentEntity environment) => new()
    {
        Id = environment.Id, ProjectId = environment.ProjectId, Name = environment.Name,
        Type = environment.Type, CreatedAt = environment.CreatedAt, IsActive = environment.IsActive, DeactivatedAt = environment.DeactivatedAt
    };
}
