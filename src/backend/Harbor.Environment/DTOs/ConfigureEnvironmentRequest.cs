namespace Harbor.Environment.DTOs;

/// <summary>Payload for saving an environment's deployment information, configuration, and secure values.</summary>
public class ConfigureEnvironmentRequest
{
    public string? DeploymentUrl { get; set; }
    public string? Provider { get; set; }
    public List<ConfigurationItemRequest> Configuration { get; set; } = [];
    public List<ConfigurationItemRequest> SecureValues { get; set; } = [];
}