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
    }

    private RSA GetRsa()
    {
        if (_rsa != null) return _rsa;

        if (string.IsNullOrWhiteSpace(_options.PrivateKeyBase64))
            throw new InvalidOperationException("GITHUB_APP_PRIVATE_KEY_BASE64 is not configured.");

        var keyPem = Encoding.UTF8.GetString(Convert.FromBase64String(_options.PrivateKeyBase64));
        _rsa = RSA.Create();
        _rsa.ImportFromPem(keyPem.ToCharArray());
        return _rsa;
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

        LogDiagnostics(jwt, rsa, now);

        return jwt;
    }

    // TEMPORARY DIAGNOSTIC. Logs only non-secret metadata so a production 401 from
    // GitHub can be attributed to the token's shape, claims, or signing key without ever
    // emitting the JWT, its signature, the private key, or an Authorization header.
    // Remove this method and its call site once the production cause is identified.
    private void LogDiagnostics(string jwt, RSA rsa, long now)
    {
        try
        {
            var segments = jwt.Split('.');
            var headerJson = Base64UrlDecode(segments[0]);
            var payloadJson = Base64UrlDecode(segments[1]);
            using var header = JsonDocument.Parse(headerJson);
            using var payload = JsonDocument.Parse(payloadJson);

            var issElement = payload.RootElement.GetProperty("iss");
            var iat = payload.RootElement.GetProperty("iat").GetInt64();
            var exp = payload.RootElement.GetProperty("exp").GetInt64();

            _logger.LogInformation(
                "GITHUB_APP_JWT_DIAGNOSTIC AppId={AppId} Segments={Segments} Header={Header} Payload={Payload} " +
                "IssKind={IssKind} Iss={Iss} Iat={Iat} Exp={Exp} CurrentUnixTime={Now} " +
                "LifetimeSeconds={Lifetime} ClockOffsetSeconds={ClockOffset} JwtLength={JwtLength} " +
                "SignatureSegmentLength={SignatureLength} HasStdBase64Chars={HasStdBase64Chars} " +
                "RsaKeySize={KeySize} PublicKeyFingerprint={Fingerprint}",
                _options.AppId,
                segments.Length,
                headerJson,
                payloadJson,
                issElement.ValueKind,
                issElement.ValueKind == JsonValueKind.String ? issElement.GetString() : issElement.GetRawText(),
                iat,
                exp,
                now,
                exp - iat,
                now - iat,
                jwt.Length,
                segments.Length > 2 ? segments[2].Length : 0,
                jwt.Any(c => c is '+' or '/' or '='),
                rsa.KeySize,
                PublicKeyFingerprint(rsa));
        }
        catch (Exception ex)
        {
            _logger.LogWarning("GITHUB_APP_JWT_DIAGNOSTIC failed to decode token metadata: {Reason}", ex.Message);
        }
    }

    // SHA-256 over the SubjectPublicKeyInfo DER, matching the fingerprint format GitHub
    // shows on the app's private key page. Derived from the loaded private key; the private
    // key material itself is never logged.
    private static string PublicKeyFingerprint(RSA rsa) =>
        "SHA256:" + Convert.ToBase64String(SHA256.HashData(rsa.ExportSubjectPublicKeyInfo()));

    private static string Base64UrlDecode(string input)
    {
        var standard = input.Replace('-', '+').Replace('_', '/');
        return Encoding.UTF8.GetString(Convert.FromBase64String(
            standard.PadRight(standard.Length + (4 - standard.Length % 4) % 4, '=')));
    }

    private static string Base64Url(string input) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(input))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Base64Url(byte[] input) =>
        Convert.ToBase64String(input)
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
