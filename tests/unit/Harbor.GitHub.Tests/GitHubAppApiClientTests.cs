using System.Net;
using System.Text;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace Harbor.GitHub.Tests
{
    /// <summary>Fake handler that returns a canned response and records the request.</summary>
    internal sealed class RecordingHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;
        private readonly string _body;

        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastRequestBody { get; private set; }
        public int CallCount { get; private set; }

        public RecordingHttpMessageHandler(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            _statusCode = statusCode;
            _body = body;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            LastRequest = request;
            if (request.Content != null)
                LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(_statusCode)
            {
                Content = new StringContent(_body, Encoding.UTF8, "application/json")
            };
        }
    }

    public class GitHubAppApiClientTests
    {
        private const string WebhookSecret = "harbor-webhook-secret";

        private static GitHubAppApiClient CreateClient(
            string body,
            out RecordingHttpMessageHandler handler,
            HttpStatusCode statusCode = HttpStatusCode.OK,
            string webhookSecret = WebhookSecret,
            string appId = "1")
        {
            handler = new RecordingHttpMessageHandler(body, statusCode);
            var jwtProvider = new GitHubAppJwtProvider(Options.Create(new GitHubAppOptions
            {
                AppId = long.Parse(appId),
                PrivateKeyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(GenerateTestPrivateKeyPem()))
            }));
            var options = Options.Create(new GitHubAppOptions
            {
                AppId = long.Parse(appId),
                WebhookSecret = webhookSecret,
                PrivateKeyBase64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(GenerateTestPrivateKeyPem()))
            });

            return new GitHubAppApiClient(
                new HttpClient(handler) { BaseAddress = new Uri("https://api.github.com/") },
                jwtProvider,
                options,
                NullLogger<GitHubAppApiClient>.Instance);
        }

        private static string GenerateTestPrivateKeyPem()
        {
            using var rsa = System.Security.Cryptography.RSA.Create(2048);
            return rsa.ExportRSAPrivateKeyPem();
        }

        // ---------- GetUserInstallationIdAsync ----------

        [Fact]
        public async Task GetUserInstallationIdAsync_ReturnsFirstInstallationId()
        {
            var client = CreateClient(
                """{ "installations": [ { "id": 12345 }, { "id": 999 } ] }""",
                out _);

            var id = await client.GetUserInstallationIdAsync("user-token");

            Assert.Equal(12345, id);
        }

        [Fact]
        public async Task GetUserInstallationIdAsync_SendsBearerTokenAndAcceptHeader()
        {
            var client = CreateClient("""{ "installations": [] }""", out var handler);

            await client.GetUserInstallationIdAsync("user-token");

            Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
            Assert.Equal("/user/installations", handler.LastRequest.RequestUri!.AbsolutePath);
            Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
            Assert.Equal("user-token", handler.LastRequest.Headers.Authorization.Parameter);
            Assert.Contains("application/vnd.github+json", handler.LastRequest.Headers.Accept.ToString());
        }

        [Fact]
        public async Task GetUserInstallationIdAsync_EmptyInstallationsArray_ReturnsNull()
        {
            var client = CreateClient("""{ "installations": [] }""", out _);

            Assert.Null(await client.GetUserInstallationIdAsync("user-token"));
        }

        [Fact]
        public async Task GetUserInstallationIdAsync_MissingInstallationsProperty_ReturnsNull()
        {
            var client = CreateClient("""{ "total_count": 0 }""", out _);

            Assert.Null(await client.GetUserInstallationIdAsync("user-token"));
        }

        [Fact]
        public async Task GetUserInstallationIdAsync_NonSuccessStatus_ReturnsNull()
        {
            var client = CreateClient("""{ "message": "Bad credentials" }""", out _, HttpStatusCode.Unauthorized);

            Assert.Null(await client.GetUserInstallationIdAsync("bad-token"));
        }

        // ---------- GetAppInfoAsync ----------

        [Fact]
        public async Task GetAppInfoAsync_ParsesAppMetadata()
        {
            var client = CreateClient(
                """{ "id": 4321, "slug": "harbor-app", "name": "Harbor", "external_url": "https://harbor.dev" }""",
                out _,
                appId: "4321");

            var info = await client.GetAppInfoAsync();

            Assert.NotNull(info);
            Assert.Equal(4321, info!.Id);
            Assert.Equal("harbor-app", info.Slug);
            Assert.Equal("Harbor", info.Name);
            Assert.Equal("https://harbor.dev", info.ExternalUrl);
        }

        [Fact]
        public async Task GetAppInfoAsync_SendsGeneratedAppJwtAsBearer()
        {
            var client = CreateClient("""{ "id": 1 }""", out var handler, appId: "1");

            await client.GetAppInfoAsync();

            var authorization = handler.LastRequest!.Headers.Authorization!;
            Assert.Equal("Bearer", authorization.Scheme);
            // App JWTs are three base64url segments, not a user access token.
            Assert.Equal(3, authorization.Parameter!.Split('.').Length);
        }

        [Fact]
        public async Task GetAppInfoAsync_NonSuccessStatus_ReturnsNull()
        {
            var client = CreateClient("""{ "message": "Bad credentials" }""", out _, HttpStatusCode.Unauthorized);

            Assert.Null(await client.GetAppInfoAsync());
        }

        // ---------- VerifyWebhookSignatureAsync ----------

        private static string ComputeSignature(string secret, string payload)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(secret));
            return "sha256=" + Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_ValidSignature_ReturnsTrue()
        {
            const string payload = """{"action":"push","installation":{"id":1}}""";
            var client = CreateClient("{}", out _, webhookSecret: WebhookSecret);

            var signature = ComputeSignature(WebhookSecret, payload);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            Assert.True(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_ValidSignatureWithStreamPartiallyRead_StillReturnsTrue()
        {
            // The client resets bodyStream.Position to 0, so a previously-read stream works.
            const string payload = """{"action":"push"}""";
            var client = CreateClient("{}", out _, webhookSecret: WebhookSecret);
            var signature = ComputeSignature(WebhookSecret, payload);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            stream.Position = 5; // simulate a partially consumed stream

            Assert.True(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_TamperedPayload_ReturnsFalse()
        {
            const string original = """{"action":"push"}""";
            const string tampered = """{"action":"delete"}""";
            var client = CreateClient("{}", out _, webhookSecret: WebhookSecret);
            var signature = ComputeSignature(WebhookSecret, original);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(tampered));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_WrongSecret_ReturnsFalse()
        {
            const string payload = """{"action":"push"}""";
            var client = CreateClient("{}", out _, webhookSecret: "the-real-secret");
            var signature = ComputeSignature("a-different-secret", payload);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task VerifyWebhookSignatureAsync_EmptySignature_ReturnsFalse(string signature)
        {
            var client = CreateClient("{}", out _);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes("{}"));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Theory]
        [InlineData("deadbeef")]
        [InlineData("sha1=abc")]
        [InlineData("md5=abc")]
        public async Task VerifyWebhookSignatureAsync_MissingOrWrongAlgorithmPrefix_ReturnsFalse(string signature)
        {
            var client = CreateClient("{}", out _);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes("{}"));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_AcceptsUppercaseSha256Prefix()
        {
            const string payload = """{"action":"push"}""";
            var client = CreateClient("{}", out _);
            var signature = ComputeSignature(WebhookSecret, payload).Replace("sha256=", "SHA256=");

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            Assert.True(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_UppercaseHexDigest_IsRejected()
        {
            // The computed digest is lowercased and then compared byte-for-byte with
            // CryptographicOperations.FixedTimeEquals, so an uppercase digest is rejected.
            // GitHub always sends lowercase hex, so this only rejects non-conforming senders
            // and keeps the constant-time comparison intact.
            const string payload = """{"action":"push"}""";
            var client = CreateClient("{}", out _);
            using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(WebhookSecret));
            var signature = "sha256=" + Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_UnconfiguredWebhookSecret_ReturnsFalse()
        {
            const string payload = """{"action":"push"}""";
            var client = CreateClient("{}", out _, webhookSecret: string.Empty);
            var signature = ComputeSignature(WebhookSecret, payload);

            using var stream = new MemoryStream(Encoding.UTF8.GetBytes(payload));
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, signature));
        }

        [Fact]
        public async Task VerifyWebhookSignatureAsync_EmptyPayloadWithEmptySecret_ReturnsFalse()
        {
            // Guard against a "no secret configured" deployment silently accepting webhooks.
            var client = CreateClient("{}", out _, webhookSecret: string.Empty);

            using var stream = new MemoryStream(Array.Empty<byte>());
            Assert.False(await client.VerifyWebhookSignatureAsync(stream, ComputeSignature(WebhookSecret, "")));
        }
    }
}
