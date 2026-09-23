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
}
