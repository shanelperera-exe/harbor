namespace Harbor.GitHub;

public sealed class GitHubAppOptions
{
    public long AppId { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string PrivateKeyBase64 { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://api.github.com/";
    /// <summary>
    /// Public origin used to construct the OAuth callback redirect_uri.
    /// Defaults to http://localhost:5000 so tests that do not configure
    /// the environment get a deterministic value.
    /// Populated from the API_GATEWAY_URL environment variable in production.
    /// </summary>
    public string ApiOrigin { get; set; } = "http://localhost:5000";
}
