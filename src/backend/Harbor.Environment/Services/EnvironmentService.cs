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

    private static EnvironmentResponse ToResponse(EnvironmentEntity environment) => new()
    {
        Id = environment.Id, ProjectId = environment.ProjectId, Name = environment.Name,
        Type = environment.Type, CreatedAt = environment.CreatedAt
    };
}
