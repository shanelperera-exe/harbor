using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public interface IGitHubAppApiClient
{
    Task<long?> GetUserInstallationIdAsync(string userAccessToken, CancellationToken ct = default);
    Task<GitHubAppInfo?> GetAppInfoAsync(CancellationToken ct = default);
    Task<bool> VerifyWebhookSignatureAsync(Stream bodyStream, string signature, CancellationToken ct = default);
}

public sealed class GitHubAppApiClient : IGitHubAppApiClient
{
    private readonly HttpClient _httpClient;
    private readonly IGitHubAppJwtProvider _jwtProvider;
    private readonly GitHubAppOptions _options;
    private readonly ILogger<GitHubAppApiClient> _logger;

    public GitHubAppApiClient(HttpClient httpClient, IGitHubAppJwtProvider jwtProvider,
        IOptions<GitHubAppOptions> options, ILogger<GitHubAppApiClient> logger)
    {
        _httpClient = httpClient;
        _jwtProvider = jwtProvider;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<long?> GetUserInstallationIdAsync(string userAccessToken, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "user/installations");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userAccessToken);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("GitHub user installations query failed ({Status})", response.StatusCode);
            return null;
        }

        var content = await response.Content.ReadAsStringAsync(ct);
        var doc = JsonDocument.Parse(content);

        if (doc.RootElement.TryGetProperty("installations", out var installations) && installations.GetArrayLength() > 0)
        {
            var first = installations[0];
            if (first.TryGetProperty("id", out var id))
                return id.GetInt64();
        }

        return null;
    }

    public async Task<GitHubAppInfo?> GetAppInfoAsync(CancellationToken ct = default)
    {
        var jwt = _jwtProvider.GenerateAppJwt();

        using var request = new HttpRequestMessage(HttpMethod.Get, "app");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await _httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync(ct);
        return JsonSerializer.Deserialize<GitHubAppInfo>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    public async Task<bool> VerifyWebhookSignatureAsync(Stream bodyStream, string signature, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(signature) || string.IsNullOrWhiteSpace(_options.WebhookSecret))
            return false;

        if (!signature.StartsWith("sha256=", StringComparison.OrdinalIgnoreCase))
            return false;

        var signatureHex = signature.Substring(7);

        using var hmac = new System.Security.Cryptography.HMACSHA256(System.Text.Encoding.UTF8.GetBytes(_options.WebhookSecret));
        bodyStream.Position = 0;
        var hash = await hmac.ComputeHashAsync(bodyStream, ct);
        var computed = Convert.ToHexString(hash).ToLowerInvariant();

        return CryptographicOperations.FixedTimeEquals(
            System.Text.Encoding.ASCII.GetBytes(signatureHex),
            System.Text.Encoding.ASCII.GetBytes(computed));
    }
}

public sealed class GitHubAppInfo
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("slug")]
    public string? Slug { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("external_url")]
    public string? ExternalUrl { get; set; }
}

public sealed class GitHubWebhookEvent
{
    [JsonPropertyName("action")]
    public string? Action { get; set; }

    [JsonPropertyName("installation")]
    public GitHubWebhookInstallation? Installation { get; set; }

    [JsonPropertyName("repository")]
    public GitHubWebhookRepository? Repository { get; set; }
}

public sealed class GitHubWebhookInstallation
{
    [JsonPropertyName("id")]
    public long Id { get; set; }
}

public sealed class GitHubWebhookRepository
{
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("full_name")]
    public string? FullName { get; set; }

    [JsonPropertyName("owner")]
    public GitHubWebhookOwner? Owner { get; set; }
}

public sealed class GitHubWebhookOwner
{
    [JsonPropertyName("login")]
    public string? Login { get; set; }

    [JsonPropertyName("type")]
    public string? Type { get; set; }
}
