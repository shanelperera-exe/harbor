using Harbor.Environment.Models;

namespace Harbor.Environment.Repositories;

public interface IEnvironmentConfigurationRepository
{
    Task<List<EnvironmentConfigurationEntity>> GetByEnvironmentIdAsync(int environmentId);

    /// <summary>Replaces all configuration/secure-value rows for the environment in a single transaction.</summary>
    Task ReplaceAllAsync(int environmentId, List<EnvironmentConfigurationEntity> items);
}