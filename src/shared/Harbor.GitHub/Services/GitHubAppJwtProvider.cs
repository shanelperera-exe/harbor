using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Harbor.GitHub.Services;

public sealed class GitHubAppJwtProvider : IGitHubAppJwtProvider
{
    private readonly GitHubAppOptions _options;
    private RSA? _rsa;

    public GitHubAppJwtProvider(IOptions<GitHubAppOptions> options)
    {
        _options = options.Value;
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
        var exp = now + 600;

        var header = new { alg = "RS256", typ = "JWT" };
        var payload = new { iat = now, exp = exp, iss = _options.AppId };

        var headerJson = JsonSerializer.Serialize(header);
        var payloadJson = JsonSerializer.Serialize(payload);

        var headerB64 = Base64Url(headerJson);
        var payloadB64 = Base64Url(payloadJson);

        var data = Encoding.UTF8.GetBytes($"{headerB64}.{payloadB64}");
        var signature = rsa.SignData(data, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        return $"{headerB64}.{payloadB64}.{Base64Url(signature)}";
    }

    private static string Base64Url(string input) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(input))
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string Base64Url(byte[] input) =>
        Convert.ToBase64String(input)
            .TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
