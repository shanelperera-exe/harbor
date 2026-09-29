using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public interface IGitHubAppOAuthClient
{
    string BuildAuthorizationUrl(string state, string codeChallenge);
    Task<OAuthTokenResponse?> ExchangeCodeAsync(string code, string codeVerifier, string state, CancellationToken ct = default);
    Task<GitHubUserInfo?> GetUserInfoAsync(string accessToken, CancellationToken ct = default);
}

public sealed class GitHubAppOAuthClient : IGitHubAppOAuthClient
{
    private readonly HttpClient _httpClient;
    private readonly GitHubAppOptions _options;
    private readonly string _oauthBaseUrl;
    private readonly string _apiBaseUrl;

    public GitHubAppOAuthClient(HttpClient httpClient, IOptions<GitHubAppOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _apiBaseUrl = _options.ApiBaseUrl.TrimEnd('/');
        _oauthBaseUrl = DeriveOAuthBaseUrl(_apiBaseUrl);
    }

    public string BuildAuthorizationUrl(string state, string codeChallenge)
    {
        var query = new QueryHelperBuilder($"{_oauthBaseUrl}/login/oauth/authorize")
            .Add("client_id", _options.ClientId)
            .Add("redirect_uri", $"{GetApiOrigin()}/api/auth/external/github/callback")
            .Add("state", state)
            .Add("code_challenge", codeChallenge)
            .Add("code_challenge_method", "S256")
            .Add("scope", "read:user read:org")
            .Build();

        return query;
    }

    public async Task<OAuthTokenResponse?> ExchangeCodeAsync(string code, string codeVerifier, string state, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_oauthBaseUrl}/login/oauth/access_token");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        var form = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["client_secret"] = _options.ClientSecret,
            ["code"] = code,
            ["state"] = state,
            ["code_verifier"] = codeVerifier,
            ["redirect_uri"] = $"{GetApiOrigin()}/api/auth/external/github/callback"
        };
        request.Content = new FormUrlEncodedContent(form);

        using var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(content);

        if (doc.RootElement.TryGetProperty("error", out var error))
            return null;

        var token = doc.RootElement.GetProperty("access_token").GetString();
        if (string.IsNullOrWhiteSpace(token)) return null;

        return new OAuthTokenResponse(token);
    }

    public async Task<GitHubUserInfo?> GetUserInfoAsync(string accessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"{_apiBaseUrl}/user");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.UserAgent.ParseAdd("Harbor");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<GitHubUserInfo>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public static string DeriveOAuthBaseUrl(string apiBaseUrl)
    {
        // GitHub.com API: https://api.github.com/  → OAuth base: https://github.com
        // GitHub Enterprise: https://github.example.com/api/v3/  → OAuth base: https://github.example.com
        // GitHub Enterprise (alternate): https://github.example.com/api/  → OAuth base: https://github.example.com
        if (apiBaseUrl.Contains("api.github.com", StringComparison.Ordinal))
            return "https://github.com";

        var uri = new Uri(apiBaseUrl);
        var basePath = uri.AbsolutePath.ToLowerInvariant();
        if (basePath.StartsWith("/api/v3", StringComparison.Ordinal))
            basePath = basePath[6..];
        else if (basePath.StartsWith("/api/", StringComparison.Ordinal))
            basePath = basePath[4..];
        else if (basePath.StartsWith("/api", StringComparison.Ordinal))
            basePath = basePath[3..];

        var baseUri = new Uri(uri, "/");
        return baseUri.ToString().TrimEnd('/');
    }

    private static string GetApiOrigin()
    {
        var origin = Environment.GetEnvironmentVariable("API_GATEWAY_URL") ?? "http://localhost:5000";
        return origin.TrimEnd('/');
    }

    private sealed class QueryHelperBuilder
    {
        private readonly string _baseUrl;
        private readonly Dictionary<string, string> _parameters = new();

        public QueryHelperBuilder(string baseUrl) => _baseUrl = baseUrl;

        public QueryHelperBuilder Add(string key, string value)
        {
            if (!string.IsNullOrEmpty(value))
                _parameters[key] = value;
            return this;
        }

        public string Build()
        {
            var query = string.Join("&", _parameters.Select(p =>
                $"{Uri.EscapeDataString(p.Key)}={Uri.EscapeDataString(p.Value)}"));
            return $"{_baseUrl}?{query}";
        }
    }
}

public sealed record OAuthTokenResponse(string AccessToken);

public sealed class GitHubUserInfo
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("login")]
    public string Login { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("html_url")]
    public string? HtmlUrl { get; set; }
}
