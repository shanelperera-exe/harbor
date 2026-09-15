namespace Harbor.Environment.DTOs;

public class ConfigurationItemResponse
{
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

/// <summary>A secure value is only ever exposed by key + whether it's set — never its value.</summary>
public class SecureValueResponse
{
    public string Key { get; set; } = string.Empty;
    public bool IsSet { get; set; }
}