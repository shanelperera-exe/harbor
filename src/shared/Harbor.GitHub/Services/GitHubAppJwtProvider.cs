using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public sealed class GitHubAppJwtProvider : IGitHubAppJwtProvider
{
    private readonly GitHubAppOptions _options;
    private readonly ILogger<GitHubAppJwtProvider> _logger;
    private RSA? _rsa;

    // The logger is optional so the existing unit tests, which construct this provider
    // directly, keep compiling. The container supplies the real logger through DI.
    public GitHubAppJwtProvider(IOptions<GitHubAppOptions> options, ILogger<GitHubAppJwtProvider>? logger = null)
    {
        _options = options.Value;
        _logger = logger ?? NullLogger<GitHubAppJwtProvider>.Instance;

        LogConfiguredIdentity();
    }

    // Records which App the loaded key belongs to, without logging the key. A key generated for a
    // different App is indistinguishable from a valid key until GitHub rejects the JWT, so the
    // fingerprint is the only way to confirm the pairing after a deploy.
    private void LogConfiguredIdentity()
    {
        if (_options.AppId == 0)
        {
            _logger.LogWarning(
                "GitHub App is not configured: GITHUB_APP_ID/GH_APP_ID is unset, so App JWTs cannot be minted.");
            return;
        }

        string fingerprint;
        try
        {
            fingerprint = PublicKeyFingerprint(GetRsa());
        }
        catch (Exception ex)
        {
            _logger.LogError(
                "GitHub App private key could not be loaded: {Reason}", ex.Message);
            return;
        }

        _logger.LogInformation(
            "GitHub App configured: AppId={AppId} Slug={Slug} ClientId={ClientId} KeyFingerprint={Fingerprint}",
            _options.AppId, _options.Slug, _options.ClientId, fingerprint);
    }

    private RSA GetRsa()
    {
        if (_rsa != null) return _rsa;

        if (string.IsNullOrWhiteSpace(_options.PrivateKeyBase64))
            throw new InvalidOperationException("GITHUB_APP_PRIVATE_KEY_BASE64 is not configured.");

        var keyPem = Encoding.UTF8.GetString(Convert.FromBase64String(_options.PrivateKeyBase64));
        var rsa = RSA.Create();
        try
        {
            rsa.ImportFromPem(keyPem.ToCharArray());
        }
        catch
        {
            // Do not cache a half-initialised key: a later call would reuse it and report success.
            rsa.Dispose();
            throw;
        }

        _rsa = rsa;
        return rsa;
    }

    public string GenerateAppJwt()
    {
        if (_options.AppId == 0)
            throw new InvalidOperationException("GITHUB_APP_ID is not configured.");

        var rsa = GetRsa();

        var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var exp = now + 540; // 9 minutes to avoid clock drift issues (max is 10 minutes)

        var header = new { alg = "RS256", typ = "JWT" };
        // "iss" must be serialized as a JSON string: RFC 7519 section 4.1.1 defines it as a
        // case-sensitive StringOrURI. A numeric value makes the token unreadable to
        // standards-compliant JWT consumers.
        var payload = new { iat = now - 60, exp = exp, iss = _options.AppId.ToString() };

        var headerJson = JsonSerializer.Serialize(header);
        var payloadJson = JsonSerializer.Serialize(payload);

        var headerB64 = Base64Url(headerJson);
        var payloadB64 = Base64Url(payloadJson);

        var data = Encoding.UTF8.GetBytes($"{headerB64}.{payloadB64}");
        var signature = rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        var jwt = $"{headerB64}.{payloadB64}.{Base64Url(signature)}";

        return jwt;
    }

    // SHA-256 over the SubjectPublicKeyInfo DER, matching the fingerprint format GitHub
    // shows on the app's private key page. Derived from the loaded private key; the private
    // key material itself is never logged. Logged at startup so a deployment can be checked
    // against the app whose key was uploaded, which is the usual cause of GitHub's
    // "A JSON web token could not be decoded" rejection.
    private static string PublicKeyFingerprint(RSA rsa) =>
        "SHA256:" + Convert.ToBase64String(SHA256.HashData(rsa.ExportSubjectPublicKeyInfo()));

    private static string Base64Url(string input) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(input))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Base64Url(byte[] input) =>
        Convert.ToBase64String(input)
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
