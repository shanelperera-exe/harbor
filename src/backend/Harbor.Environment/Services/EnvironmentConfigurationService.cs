using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Repositories;
using Harbor.Environment.Security;

namespace Harbor.Environment.Services;

public class EnvironmentConfigurationService(
    IEnvironmentRepository environmentRepository,
    IEnvironmentConfigurationRepository configurationRepository,
    IEnvironmentSecretProtector secretProtector,
    ILogger<EnvironmentConfigurationService> logger) : IEnvironmentConfigurationService
{
    private const int MaxKeyLength = 100;
    private const int MaxValueLength = 2000;
    private const int MaxUrlLength = 500;
    private const int MaxProviderLength = 50;

    public async Task<(bool Success, string? Error, bool Forbidden, EnvironmentConfigurationResponse? Data)> GetAsync(
        int projectId, int environmentId, int userId, bool isAdmin)
    {
        var access = await AuthorizeAsync(projectId, userId, isAdmin);
        if (!access.Success) return (false, access.Error, access.Forbidden, null);

        var environment = await environmentRepository.GetByIdAsync(environmentId, projectId);
        if (environment is null || !environment.IsActive) return (false, "Environment not found or inactive.", false, null);

        var items = await configurationRepository.GetByEnvironmentIdAsync(environmentId);
        return (true, null, false, ToResponse(environment, items));
    }

    public async Task<(bool Success, string? Error, bool Forbidden, EnvironmentConfigurationResponse? Data)> ConfigureAsync(
        int projectId, int environmentId, ConfigureEnvironmentRequest request, int userId, bool isAdmin)
    {
        var access = await AuthorizeAsync(projectId, userId, isAdmin);
        if (!access.Success) return (false, access.Error, access.Forbidden, null);

        var environment = await environmentRepository.GetByIdAsync(environmentId, projectId);
        if (environment is null || !environment.IsActive) return (false, "Environment not found or inactive.", false, null);

        // --- Validate deployment information ---
        if (string.IsNullOrWhiteSpace(request.DeploymentUrl))
            return (false, "Deployment URL is required.", false, null);
        var deploymentUrl = request.DeploymentUrl.Trim();
        if (deploymentUrl.Length > MaxUrlLength || !Uri.TryCreate(deploymentUrl, UriKind.Absolute, out var parsedUrl)
            || (parsedUrl.Scheme != Uri.UriSchemeHttp && parsedUrl.Scheme != Uri.UriSchemeHttps))
            return (false, "Deployment URL must be a valid absolute http(s) URL.", false, null);

        if (string.IsNullOrWhiteSpace(request.Provider))
            return (false, "Provider is required.", false, null);
        var provider = request.Provider.Trim();
        if (provider.Length > MaxProviderLength)
            return (false, $"Provider cannot exceed {MaxProviderLength} characters.", false, null);

        // --- Validate configuration + secure values (required, well-formed, unique keys) ---
        var validationError = ValidateItems(request.Configuration, "Configuration")
            ?? ValidateItems(request.SecureValues, "Secure value", allowBlankValue: true);
        if (validationError is not null) return (false, validationError, false, null);

        var allKeys = request.Configuration.Select(c => c.Key!.Trim().ToLowerInvariant())
            .Concat(request.SecureValues.Select(s => s.Key!.Trim().ToLowerInvariant()));
        if (allKeys.GroupBy(k => k).Any(g => g.Count() > 1))
            return (false, "Configuration and secure value keys must be unique.", false, null);

        // Secret entries may omit "Value" to keep the previously stored secret unchanged.
        var existingSecrets = (await configurationRepository.GetByEnvironmentIdAsync(environmentId))
            .Where(i => i.IsSecret).ToDictionary(i => i.Key, StringComparer.Ordinal);

        var now = DateTime.UtcNow;
        var itemsToSave = new List<EnvironmentConfigurationEntity>();

        foreach (var item in request.Configuration)
        {
            itemsToSave.Add(new EnvironmentConfigurationEntity
            {
                EnvironmentId = environmentId, Key = item.Key!.Trim(), Value = item.Value!.Trim(),
                IsSecret = false, CreatedAt = now, UpdatedAt = now
            });
        }

        foreach (var item in request.SecureValues)
        {
            var key = item.Key!.Trim();
            string cipherText;
            if (!string.IsNullOrWhiteSpace(item.Value))
            {
                cipherText = secretProtector.Protect(item.Value.Trim());
            }
            else if (existingSecrets.TryGetValue(key, out var existing))
            {
                cipherText = existing.Value; // keep previously stored ciphertext unchanged
            }
            else
            {
                return (false, $"A value is required for new secure entry '{key}'.", false, null);
            }

            itemsToSave.Add(new EnvironmentConfigurationEntity
            {
                EnvironmentId = environmentId, Key = key, Value = cipherText,
                IsSecret = true, CreatedAt = now, UpdatedAt = now
            });
        }

        await configurationRepository.ReplaceAllAsync(environmentId, itemsToSave);
        await environmentRepository.UpdateDeploymentInfoAsync(environmentId, projectId, deploymentUrl, provider);

        // Log only keys/metadata — never values, secret or otherwise.
        logger.LogInformation(
            "Environment {EnvironmentId} configuration saved with {ConfigCount} configuration item(s) and {SecretCount} secure value(s).",
            environmentId, request.Configuration.Count, request.SecureValues.Count);

        environment.DeploymentUrl = deploymentUrl;
        environment.Provider = provider;
        return (true, null, false, ToResponse(environment, itemsToSave));
    }

    private static string? ValidateItems(List<ConfigurationItemRequest> items, string label, bool allowBlankValue = false)
    {
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Key))
                return $"{label} key is required.";
            if (item.Key.Trim().Length > MaxKeyLength)
                return $"{label} key cannot exceed {MaxKeyLength} characters.";
            if (!allowBlankValue && string.IsNullOrWhiteSpace(item.Value))
                return $"{label} '{item.Key.Trim()}' requires a value.";
            if (item.Value is { Length: > MaxValueLength })
                return $"{label} '{item.Key.Trim()}' cannot exceed {MaxValueLength} characters.";
        }
        return null;
    }

    private async Task<(bool Success, string? Error, bool Forbidden)> AuthorizeAsync(int projectId, int userId, bool isAdmin)
    {
        var access = await environmentRepository.GetProjectAccessAsync(projectId);
        if (!access.Exists || access.IsArchived) return (false, "Project not found or archived.", false);
        if (!isAdmin && access.OwnerId != userId) return (false, "You do not have permission to manage this project's environments.", true);
        return (true, null, false);
    }

    private static EnvironmentConfigurationResponse ToResponse(EnvironmentEntity environment, List<EnvironmentConfigurationEntity> items) => new()
    {
        EnvironmentId = environment.Id,
        DeploymentUrl = environment.DeploymentUrl,
        Provider = environment.Provider,
        Configuration = items.Where(i => !i.IsSecret)
            .Select(i => new ConfigurationItemResponse { Key = i.Key, Value = i.Value }).ToList(),
        SecureValues = items.Where(i => i.IsSecret)
            .Select(i => new SecureValueResponse { Key = i.Key, IsSet = true }).ToList()
    };
}