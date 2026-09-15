namespace Harbor.Environment.DTOs;

public class EnvironmentResponse
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public DateTime? DeactivatedAt { get; set; }
    public string? DeploymentUrl { get; set; }
    public string? Provider { get; set; }
}