namespace Harbor.Environment.DTOs;

public class EnvironmentRemovalResponse
{
    public bool Deactivated { get; set; }
    public string Message { get; set; } = string.Empty;
}
