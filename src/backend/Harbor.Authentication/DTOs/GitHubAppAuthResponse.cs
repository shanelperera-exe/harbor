namespace Harbor.Authentication.DTOs;

public sealed class GitHubAppAuthStartResponse
{
    public string RedirectUrl { get; init; } = string.Empty;
    public string State { get; init; } = string.Empty;
    public string CodeVerifier { get; init; } = string.Empty;
}
