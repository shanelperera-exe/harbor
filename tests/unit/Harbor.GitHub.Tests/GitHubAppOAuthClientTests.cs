using System.Net;
using System.Text;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace Harbor.GitHub.Tests
{
    public class GitHubAppOAuthClientTests
    {
        private const string ClientId = "Iv1.harborclientid";
        private const string ClientSecret = "harbor-client-secret";

        private static GitHubAppOAuthClient CreateClient(
            string body,
            out RecordingHttpMessageHandler handler,
            HttpStatusCode statusCode = HttpStatusCode.OK,
            string apiBaseUrl = "https://api.github.com/")
        {
            handler = new RecordingHttpMessageHandler(body, statusCode);
            var client = new HttpClient(handler) { BaseAddress = new Uri(apiBaseUrl) };
            return new GitHubAppOAuthClient(client, Options.Create(new GitHubAppOptions
            {
                ClientId = ClientId,
                ClientSecret = ClientSecret,
                ApiBaseUrl = apiBaseUrl
            }));
        }

        // ---------- DeriveOAuthBaseUrl ----------

        [Fact]
        public void DeriveOAuthBaseUrl_GitHubComApi_ReturnsGitHubCom()
        {
            Assert.Equal("https://github.com", GitHubAppOAuthClient.DeriveOAuthBaseUrl("https://api.github.com/"));
        }

        [Fact]
        public void DeriveOAuthBaseUrl_EnterpriseApiV3_StripsApiV3Segment()
        {
            Assert.Equal(
                "https://github.example.com",
                GitHubAppOAuthClient.DeriveOAuthBaseUrl("https://github.example.com/api/v3/"));
        }

        [Fact]
        public void DeriveOAuthBaseUrl_EnterpriseApi_StripsApiSegment()
        {
            Assert.Equal(
                "https://github.example.com",
                GitHubAppOAuthClient.DeriveOAuthBaseUrl("https://github.example.com/api/"));
        }

        [Fact]
        public void DeriveOAuthBaseUrl_EnterpriseWithoutTrailingSlash_StripsApiSegment()
        {
            Assert.Equal(
                "https://github.example.com",
                GitHubAppOAuthClient.DeriveOAuthBaseUrl("https://github.example.com/api"));
        }

        [Fact]
        public void DeriveOAuthBaseUrl_HostOnly_KeepsHost()
        {
            Assert.Equal(
                "https://github.example.com",
                GitHubAppOAuthClient.DeriveOAuthBaseUrl("https://github.example.com/"));
        }

        // ---------- BuildAuthorizationUrl ----------

        [Fact]
        public void BuildAuthorizationUrl_IncludesPkceAndStateParameters()
        {
            var client = CreateClient("{}", out _);

            var url = client.BuildAuthorizationUrl("state-123", "challenge-abc");

            Assert.StartsWith("https://github.com/login/oauth/authorize?", url);
            Assert.Contains($"client_id={ClientId}", url);
            Assert.Contains("state=state-123", url);
            Assert.Contains("code_challenge=challenge-abc", url);
            Assert.Contains("code_challenge_method=S256", url);
            Assert.Contains("scope=read%3Auser%20read%3Aorg", url);
        }

        [Fact]
        public void BuildAuthorizationUrl_IncludesCallbackRedirectUri()
        {
            var client = CreateClient("{}", out _);

            var url = client.BuildAuthorizationUrl("state", "challenge");

            Assert.Contains("redirect_uri=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fauth%2Fexternal%2Fgithub%2Fcallback", url);
        }

        [Fact]
        public void BuildAuthorizationUrl_EscapesSpecialCharactersInState()
        {
            var client = CreateClient("{}", out _);

            var url = client.BuildAuthorizationUrl("a b&c=d", "challenge");

            Assert.Contains("state=a%20b%26c%3Dd", url);
            // The raw separators must not survive into the query string.
            Assert.DoesNotContain("state=a b&c=d", url);
        }

        [Fact]
        public void BuildAuthorizationUrl_OmitsParametersWithEmptyValues()
        {
            var client = CreateClient("{}", out _, apiBaseUrl: "https://api.github.com/");

            // ClientId is set, so only genuinely empty values are dropped.
            var url = client.BuildAuthorizationUrl(string.Empty, string.Empty);

            Assert.DoesNotContain("state=", url);
            Assert.DoesNotContain("code_challenge=", url);
        }

        [Fact]
        public void BuildAuthorizationUrl_UsesEnterpriseHost_WhenApiBaseUrlIsEnterprise()
        {
            var client = CreateClient("{}", out _, apiBaseUrl: "https://github.example.com/api/v3/");

            var url = client.BuildAuthorizationUrl("state", "challenge");

            Assert.StartsWith("https://github.example.com/login/oauth/authorize?", url);
        }

        // ---------- ExchangeCodeAsync ----------

        [Fact]
        public async Task ExchangeCodeAsync_SuccessResponse_ReturnsAccessToken()
        {
            var client = CreateClient("""{ "access_token": "gho_token", "token_type": "bearer" }""", out _);

            var result = await client.ExchangeCodeAsync("code-1", "verifier-1", "state-1");

            Assert.NotNull(result);
            Assert.Equal("gho_token", result!.AccessToken);
        }

        [Fact]
        public async Task ExchangeCodeAsync_PostsFormEncodedPkceParameters()
        {
            var client = CreateClient("""{ "access_token": "gho_token" }""", out var handler);

            await client.ExchangeCodeAsync("code-1", "verifier-1", "state-1");

            Assert.Equal(HttpMethod.Post, handler.LastRequest!.Method);
            Assert.Equal("/login/oauth/access_token", handler.LastRequest.RequestUri!.AbsolutePath);
            Assert.Equal("application/json", handler.LastRequest.Headers.Accept.ToString());

            var body = handler.LastRequestBody!;
            Assert.Contains("client_id=Iv1.harborclientid", body);
            Assert.Contains("client_secret=harbor-client-secret", body);
            Assert.Contains("code=code-1", body);
            Assert.Contains("code_verifier=verifier-1", body);
            Assert.Contains("state=state-1", body);
            Assert.Contains("redirect_uri=", body);
        }

        [Fact]
        public async Task ExchangeCodeAsync_ErrorResponse_ReturnsNull()
        {
            var client = CreateClient(
                """{ "error": "bad_verification_code", "error_description": "The code passed is incorrect" }""",
                out _);

            Assert.Null(await client.ExchangeCodeAsync("bad", "verifier", "state"));
        }

        [Fact]
        public async Task ExchangeCodeAsync_NonSuccessStatus_ReturnsNull()
        {
            var client = CreateClient("""{ "access_token": "gho_token" }""", out _, HttpStatusCode.BadRequest);

            Assert.Null(await client.ExchangeCodeAsync("code", "verifier", "state"));
        }

        [Fact]
        public async Task ExchangeCodeAsync_BlankAccessToken_ReturnsNull()
        {
            var client = CreateClient("""{ "access_token": "   " }""", out _);

            Assert.Null(await client.ExchangeCodeAsync("code", "verifier", "state"));
        }

        [Fact]
        public async Task ExchangeCodeAsync_MissingAccessTokenProperty_Throws()
        {
            // GitHub always returns access_token or error; a payload with neither is a
            // protocol violation and surfaces rather than being silently swallowed.
            var client = CreateClient("""{ "token_type": "bearer" }""", out _);

            await Assert.ThrowsAnyAsync<Exception>(
                () => client.ExchangeCodeAsync("code", "verifier", "state"));
        }

        // ---------- GetUserInfoAsync ----------

        [Fact]
        public async Task GetUserInfoAsync_ParsesUserProfile()
        {
            var client = CreateClient(
                """
                { "id": 583231, "login": "octocat", "name": "The Octocat",
                  "email": "octocat@github.com", "avatar_url": "https://avatars.githubusercontent.com/u/583231",
                  "html_url": "https://github.com/octocat" }
                """,
                out _);

            var user = await client.GetUserInfoAsync("gho_token");

            Assert.NotNull(user);
            Assert.Equal(583231, user!.Id);
            Assert.Equal("octocat", user.Login);
            Assert.Equal("The Octocat", user.Name);
            Assert.Equal("octocat@github.com", user.Email);
            Assert.Equal("https://github.com/octocat", user.HtmlUrl);
        }

        [Fact]
        public async Task GetUserInfoAsync_SendsBearerTokenAndHarborUserAgent()
        {
            var client = CreateClient("""{ "id": 1, "login": "octocat" }""", out var handler);

            await client.GetUserInfoAsync("gho_token");

            Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
            Assert.Equal("/user", handler.LastRequest.RequestUri!.AbsolutePath);
            Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
            Assert.Equal("gho_token", handler.LastRequest.Headers.Authorization.Parameter);
            Assert.Contains("Harbor", handler.LastRequest.Headers.UserAgent.ToString());
        }

        [Fact]
        public async Task GetUserInfoAsync_NonSuccessStatus_ReturnsNull()
        {
            var client = CreateClient("""{ "message": "Bad credentials" }""", out _, HttpStatusCode.Unauthorized);

            Assert.Null(await client.GetUserInfoAsync("bad-token"));
        }

        [Fact]
        public async Task GetUserInfoAsync_MissingOptionalFields_StillParses()
        {
            var client = CreateClient("""{ "id": 7, "login": "minimal" }""", out _);

            var user = await client.GetUserInfoAsync("gho_token");

            Assert.NotNull(user);
            Assert.Equal(7, user!.Id);
            Assert.Equal("minimal", user.Login);
            Assert.Null(user.Name);
            Assert.Null(user.Email);
        }
    }
}
