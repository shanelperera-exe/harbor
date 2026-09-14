namespace Harbor.Environment.DTOs;

public class EnvironmentConfigurationResponse
{
    public int EnvironmentId { get; set; }
    public string? DeploymentUrl { get; set; }
    public string? Provider { get; set; }
    public List<ConfigurationItemResponse> Configuration { get; set; } = [];
    public List<SecureValueResponse> SecureValues { get; set; } = [];
}