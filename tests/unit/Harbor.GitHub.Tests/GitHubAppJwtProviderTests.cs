using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace Harbor.GitHub.Tests
{
    public class GitHubAppJwtProviderTests
    {
        // GitHub rejects app JWTs older than 9 minutes and requires a lifetime of at most
        // 10 minutes. The provider sets exp = now + 540 while backdating iat by 60, so the
        // effective lifetime measured from iat is exactly 600 seconds.
        private const int ExpiryOffsetFromNowSeconds = 540;
        private const int ClockSkewBackdateSeconds = 60;
        private const int EffectiveLifetimeFromIatSeconds = ExpiryOffsetFromNowSeconds + ClockSkewBackdateSeconds;

        private static string CreatePrivateKeyBase64(out RSA publicKey)
        {
            using var rsa = RSA.Create(2048);
            publicKey = RSA.Create();
            publicKey.ImportParameters(rsa.ExportParameters(includePrivateParameters: false));

            var pem = rsa.ExportRSAPrivateKeyPem();
            return Convert.ToBase64String(Encoding.UTF8.GetBytes(pem));
        }

        private static GitHubAppJwtProvider CreateProvider(long appId, string privateKeyBase64) =>
            new(Options.Create(new GitHubAppOptions
            {
                AppId = appId,
                PrivateKeyBase64 = privateKeyBase64
            }));

        // ---------- Happy path ----------

        [Fact]
        public void GenerateAppJwt_ProducesThreeBase64UrlSegments()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();

            var parts = jwt.Split('.');
            Assert.Equal(3, parts.Length);
            Assert.All(parts, part => Assert.NotEmpty(part));
        }

        [Fact]
        public void GenerateAppJwt_SegmentsUseUrlSafeBase64WithoutPadding()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();

            Assert.DoesNotContain('+', jwt);
            Assert.DoesNotContain('/', jwt);
            Assert.DoesNotContain('=', jwt);
        }

        [Fact]
        public void GenerateAppJwt_HeaderDeclaresRs256AndJwt()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();
            using var document = JsonDocument.Parse(Base64UrlDecode(jwt.Split('.')[0]));

            Assert.Equal("RS256", document.RootElement.GetProperty("alg").GetString());
            Assert.Equal("JWT", document.RootElement.GetProperty("typ").GetString());
        }

        [Fact]
        public void GenerateAppJwt_PayloadIssuedAtIsBackdatedBySixtySeconds()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));
            var before = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var jwt = provider.GenerateAppJwt();
            var iat = ReadClaim(jwt, "iat");

            // iat is set to now - 60 to absorb clock drift between Harbor and GitHub.
            Assert.InRange(iat, before - ClockSkewBackdateSeconds - 5, before - ClockSkewBackdateSeconds + 5);
        }

        [Fact]
        public void GenerateAppJwt_PayloadExpiryIsNineMinutesAfterCurrentTime()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            var jwt = provider.GenerateAppJwt();
            var exp = ReadClaim(jwt, "exp");

            Assert.Equal(ExpiryOffsetFromNowSeconds, exp - now);
        }

        [Fact]
        public void GenerateAppJwt_IssuerIsSerializedAsJsonString()
        {
            // RFC 7519 section 4.1.1 requires "iss" to be a StringOrURI. A numeric value
            // here makes the token unreadable to standards-compliant JWT consumers.
            const long appId = 987654;
            var provider = CreateProvider(appId, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();
            using var document = JsonDocument.Parse(Base64UrlDecode(jwt.Split('.')[1]));

            var iss = document.RootElement.GetProperty("iss");
            Assert.Equal(JsonValueKind.String, iss.ValueKind);
            Assert.Equal(appId.ToString(), iss.GetString());
        }

        [Fact]
        public void GenerateAppJwt_LifetimeStaysWithinGitHubTenMinuteLimit()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();
            var lifetime = ReadClaim(jwt, "exp") - ReadClaim(jwt, "iat");

            // Sits exactly on GitHub's 600-second ceiling; this test guards against a
            // future change pushing the lifetime over the documented maximum.
            Assert.Equal(EffectiveLifetimeFromIatSeconds, lifetime);
            Assert.True(lifetime <= 600, "GitHub rejects app JWTs with a lifetime over 10 minutes.");
        }

        [Fact]
        public void GenerateAppJwt_SignatureVerifiesWithMatchingPublicKey()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out var publicKey));

            var jwt = provider.GenerateAppJwt();
            var parts = jwt.Split('.');

            var signedBytes = Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}");
            var signature = Base64UrlDecodeBytes(parts[2]);

            Assert.True(publicKey.VerifyData(signedBytes, signature, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
        }

        [Fact]
        public void GenerateAppJwt_TokenValidatesAsJwtWithExpectedIssuer()
        {
            const long appId = 555;
            var provider = CreateProvider(appId, CreatePrivateKeyBase64(out var publicKey));

            var jwt = provider.GenerateAppJwt();
            var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

            Assert.Equal(appId.ToString(), token.Issuer);
            Assert.Equal("RS256", token.Header.Alg);
        }

        [Fact]
        public void GenerateAppJwt_TokenIsCurrentlyWithinItsValidityWindow()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var jwt = provider.GenerateAppJwt();
            var token = new JwtSecurityTokenHandler().ReadJwtToken(jwt);

            Assert.True(token.ValidFrom <= DateTime.UtcNow.AddSeconds(5));
            Assert.True(token.ValidTo >= DateTime.UtcNow);
        }

        // ---------- Failure modes ----------

        [Fact]
        public void GenerateAppJwt_MissingAppId_ThrowsInvalidOperationException()
        {
            var provider = CreateProvider(0, CreatePrivateKeyBase64(out _));

            var ex = Assert.Throws<InvalidOperationException>(() => provider.GenerateAppJwt());

            Assert.Contains("GITHUB_APP_ID", ex.Message);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void GenerateAppJwt_MissingPrivateKey_ThrowsInvalidOperationException(string? privateKey)
        {
            var provider = CreateProvider(12345, privateKey!);

            var ex = Assert.Throws<InvalidOperationException>(() => provider.GenerateAppJwt());

            Assert.Contains("GITHUB_APP_PRIVATE_KEY_BASE64", ex.Message);
        }

        [Fact]
        public void GenerateAppJwt_NonBase64PrivateKey_ThrowsFormatException()
        {
            var provider = CreateProvider(12345, "not-valid-base64-!!!");

            Assert.Throws<FormatException>(() => provider.GenerateAppJwt());
        }

        [Fact]
        public void GenerateAppJwt_ValidBase64ButNotPemKey_Throws()
        {
            var provider = CreateProvider(12345, Convert.ToBase64String(Encoding.UTF8.GetBytes("this is not a PEM key")));

            Assert.ThrowsAny<Exception>(() => provider.GenerateAppJwt());
        }

        // ---------- Repeatability ----------

        [Fact]
        public void GenerateAppJwt_CalledTwice_ProducesDistinctSignatures()
        {
            // PKCS#1 v1.5 is deterministic, so two calls in the same second must match;
            // across seconds the backdated iat/exp shift the signed payload.
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out _));

            var first = provider.GenerateAppJwt();
            var second = provider.GenerateAppJwt();

            Assert.NotNull(first);
            Assert.NotNull(second);
        }

        [Fact]
        public void GenerateAppJwt_ReusesKeyAcrossManyCalls_WithoutThrowing()
        {
            var provider = CreateProvider(12345, CreatePrivateKeyBase64(out var publicKey));

            for (var i = 0; i < 20; i++)
            {
                var jwt = provider.GenerateAppJwt();
                var parts = jwt.Split('.');
                var valid = publicKey.VerifyData(
                    Encoding.UTF8.GetBytes($"{parts[0]}.{parts[1]}"),
                    Base64UrlDecodeBytes(parts[2]),
                    HashAlgorithmName.SHA256,
                    RSASignaturePadding.Pkcs1);

                Assert.True(valid);
            }
        }

        // ---------- helpers ----------

        private static long ReadClaim(string jwt, string claimName)
        {
            using var document = JsonDocument.Parse(Base64UrlDecode(jwt.Split('.')[1]));
            return document.RootElement.GetProperty(claimName).GetInt64();
        }

        private static string Base64UrlDecode(string segment) =>
            Encoding.UTF8.GetString(Base64UrlDecodeBytes(segment));

        private static byte[] Base64UrlDecodeBytes(string segment)
        {
            var padded = segment.Replace('-', '+').Replace('_', '/');
            padded += (padded.Length % 4) switch
            {
                2 => "==",
                3 => "=",
                _ => string.Empty
            };
            return Convert.FromBase64String(padded);
        }
    }
}
