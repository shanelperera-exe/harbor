namespace Harbor.Environment.DTOs;

/// <summary>Payload for changing an active environment's display name or type.</summary>
public class UpdateEnvironmentRequest
{
    public string? Name { get; set; }
    public string? Type { get; set; }
}
