using System.Net;
using Harbor.Project.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Project.Tests
{
    public class TokenServiceTests
    {
        private const string AuthServiceUrl = "http://auth.test:8080";

        private static IConfiguration BuildConfiguration(string authServiceUrl = AuthServiceUrl) =>
            new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["AuthServiceUrl"] = authServiceUrl
                })
                .Build();

        private static TokenService CreateService(out FakeHttpMessageHandler handler, string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            handler = new FakeHttpMessageHandler(body, statusCode);
            return new TokenService(new HttpClient(handler), BuildConfiguration());
        }

        // ---------- GetGitHubTokenAsync ----------

        [Fact]
        public async Task GetGitHubTokenAsync_SuccessResponse_ReturnsToken()
        {
            var service = CreateService(out _, """{ "token": "ghs_abc123" }""");

            var token = await service.GetGitHubTokenAsync(7);

            Assert.Equal("ghs_abc123", token);
        }

        [Fact]
        public async Task GetGitHubTokenAsync_CallsInternalAuthEndpointForUser()
        {
            var service = CreateService(out var handler, """{ "token": "ghs_abc123" }""");

            await service.GetGitHubTokenAsync(42);

            Assert.Equal(1, handler.CallCount);
            Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
            Assert.Equal($"{AuthServiceUrl}/api/internal/users/42/installation-token", handler.LastRequest.RequestUri!.ToString());
        }

        [Fact]
        public async Task GetGitHubTokenAsync_NotFound_ReturnsNull()
        {
            var service = CreateService(out _, "not found", HttpStatusCode.NotFound);

            var token = await service.GetGitHubTokenAsync(7);

            Assert.Null(token);
        }

        [Fact]
        public async Task GetGitHubTokenAsync_ServerError_ReturnsNull()
        {
            var service = CreateService(out _, "boom", HttpStatusCode.InternalServerError);

            var token = await service.GetGitHubTokenAsync(7);

            Assert.Null(token);
        }

        [Fact]
        public async Task GetGitHubTokenAsync_ResponseWithoutTokenProperty_ReturnsNull()
        {
            var service = CreateService(out _, """{ "message": "no token" }""");

            var token = await service.GetGitHubTokenAsync(7);

            Assert.Null(token);
        }

        [Fact]
        public async Task GetGitHubTokenAsync_EmptyTokenString_ReturnsEmptyString()
        {
            var service = CreateService(out _, """{ "token": "" }""");

            var token = await service.GetGitHubTokenAsync(7);

            Assert.Equal(string.Empty, token);
        }

        // ---------- GetGitHubInstallationTokenAsync ----------

        [Fact]
        public async Task GetGitHubInstallationTokenAsync_ReturnsTokenAndExpiry()
        {
            var expiresAt = new DateTimeOffset(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);
            var service = CreateService(
                out _,
                $$"""{ "token": "ghs_xyz", "expiresAt": "{{expiresAt:O}}" }""");

            var result = await service.GetGitHubInstallationTokenAsync(7);

            Assert.NotNull(result);
            Assert.Equal("ghs_xyz", result!.Token);
            Assert.Equal(expiresAt, result.ExpiresAt);
        }

        [Fact]
        public async Task GetGitHubInstallationTokenAsync_MissingExpiresAt_DefaultsToFiftyFiveMinutesFromNow()
        {
            var service = CreateService(out _, """{ "token": "ghs_xyz" }""");
            var before = DateTimeOffset.UtcNow.AddMinutes(55);

            var result = await service.GetGitHubInstallationTokenAsync(7);

            var after = DateTimeOffset.UtcNow.AddMinutes(55);
            Assert.NotNull(result);
            Assert.InRange(result!.ExpiresAt, before.AddSeconds(-5), after.AddSeconds(5));
        }

        [Fact]
        public async Task GetGitHubInstallationTokenAsync_NotFound_ReturnsNull()
        {
            var service = CreateService(out _, "not found", HttpStatusCode.NotFound);

            var result = await service.GetGitHubInstallationTokenAsync(7);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetGitHubInstallationTokenAsync_ResponseWithoutTokenProperty_ReturnsNull()
        {
            var service = CreateService(out _, """{ "message": "no installation" }""");

            var result = await service.GetGitHubInstallationTokenAsync(7);

            Assert.Null(result);
        }

        [Fact]
        public async Task GetGitHubInstallationTokenAsync_UsesConfiguredAuthServiceUrl()
        {
            var handler = new FakeHttpMessageHandler("""{ "token": "ghs_xyz" }""");
            var service = new TokenService(
                new HttpClient(handler),
                BuildConfiguration("http://custom-auth:9000"));

            await service.GetGitHubInstallationTokenAsync(7);

            Assert.Equal(
                "http://custom-auth:9000/api/internal/users/7/installation-token",
                handler.LastRequest!.RequestUri!.ToString());
        }

        [Fact]
        public void Constructor_WithoutConfiguredUrl_FallsBackToDockerServiceName()
        {
            var handler = new FakeHttpMessageHandler("""{ "token": "ghs_xyz" }""");
            var service = new TokenService(new HttpClient(handler), BuildConfiguration(authServiceUrl: null));

            // Fire the request to observe the URL the fallback produced.
            service.GetGitHubInstallationTokenAsync(1).GetAwaiter().GetResult();

            Assert.Contains("authentication-service", handler.LastRequest!.RequestUri!.Host);
        }
    }
}
