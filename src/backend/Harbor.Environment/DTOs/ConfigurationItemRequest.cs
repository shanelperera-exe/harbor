namespace Harbor.Environment.DTOs;

/// <summary>One configuration or secure-value entry submitted by the client.</summary>
public class ConfigurationItemRequest
{
    public string? Key { get; set; }

    /// <summary>For secure values: leave null/empty to keep the existing stored secret unchanged.</summary>
    public string? Value { get; set; }
}