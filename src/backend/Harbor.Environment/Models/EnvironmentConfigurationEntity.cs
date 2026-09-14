namespace Harbor.Environment.Models;

/// <summary>A single configuration or secure value belonging to an environment.
/// For secret entries, <see cref="Value"/> holds the encrypted ciphertext, never plaintext.</summary>
public class EnvironmentConfigurationEntity
{
    public int Id { get; set; }
    public int EnvironmentId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public bool IsSecret { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}