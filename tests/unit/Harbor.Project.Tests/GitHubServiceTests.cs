using System.Net;
using System.Text.Json;
using Harbor.Project.Services;
using Xunit;

namespace Harbor.Project.Tests
{
    public class GitHubServiceTests
    {
        private static GitHubService CreateService(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            var handler = new FakeHttpMessageHandler(body, statusCode);
            return new GitHubService(new HttpClient(handler));
        }

        private static GitHubService CreateService(out FakeHttpMessageHandler handler, string body, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            handler = new FakeHttpMessageHandler(body, statusCode);
            return new GitHubService(new HttpClient(handler));
        }

        private const string RepositoriesResponse = """
        {
          "repositories": [
            {
              "id": 1296269,
              "name": "Hello-World",
              "full_name": "octocat/Hello-World",
              "owner": { "login": "octocat" },
              "html_url": "https://github.com/octocat/Hello-World",
              "clone_url": "https://github.com/octocat/Hello-World.git",
              "private": false,
              "default_branch": "main",
              "updated_at": "2026-01-15T10:30:00Z"
            },
            {
              "id": 42,
              "name": "infra",
              "full_name": "acme/infra",
              "owner": { "login": "acme" },
              "html_url": "https://github.com/acme/infra",
              "clone_url": "https://github.com/acme/infra.git",
              "private": true
            }
          ]
        }
        """;

        // ---------- GetRepositoriesAsync ----------

        [Fact]
        public async Task GetRepositoriesAsync_ParsesAllRepositoryFields()
        {
            var service = CreateService(RepositoriesResponse);

            var repos = await service.GetRepositoriesAsync("token-123");

            Assert.Equal(2, repos.Count);

            var first = repos[0];
            Assert.Equal(1296269, first.Id);
            Assert.Equal("Hello-World", first.Name);
            Assert.Equal("octocat/Hello-World", first.FullName);
            Assert.Equal("octocat", first.Owner);
            Assert.Equal("https://github.com/octocat/Hello-World", first.HtmlUrl);
            Assert.Equal("https://github.com/octocat/Hello-World.git", first.CloneUrl);
            Assert.False(first.Private);
            Assert.Equal("main", first.DefaultBranch);
            Assert.NotNull(first.UpdatedAt);
        }

        [Fact]
        public async Task GetRepositoriesAsync_MissingDefaultBranchAndUpdatedAt_UsesFallbacks()
        {
            var service = CreateService(RepositoriesResponse);

            var repos = await service.GetRepositoriesAsync("token-123");

            var second = repos[1];
            Assert.True(second.Private);
            Assert.Equal("main", second.DefaultBranch);  // defaults to "main" when absent
            Assert.Null(second.UpdatedAt);                // null when absent
        }

        [Fact]
        public async Task GetRepositoriesAsync_ResponseWithoutRepositoriesKey_ReturnsEmptyList()
        {
            var service = CreateService("""{ "total_count": 0 }""");

            var repos = await service.GetRepositoriesAsync("token-123");

            Assert.Empty(repos);
        }

        [Fact]
        public async Task GetRepositoriesAsync_EmptyRepositoryArray_ReturnsEmptyList()
        {
            var service = CreateService("""{ "repositories": [] }""");

            var repos = await service.GetRepositoriesAsync("token-123");

            Assert.Empty(repos);
        }

        [Fact]
        public async Task GetRepositoriesAsync_SendsBearerTokenAndExpectedPath()
        {
            var service = CreateService(out var handler, RepositoriesResponse);

            await service.GetRepositoriesAsync("token-123");

            Assert.Equal(1, handler.CallCount);
            Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
            Assert.Equal("/installation/repositories?per_page=100", handler.LastRequest.RequestUri!.PathAndQuery);
            Assert.Equal("Bearer", handler.LastRequest.Headers.Authorization!.Scheme);
            Assert.Equal("token-123", handler.LastRequest.Headers.Authorization.Parameter);
        }

        [Fact]
        public async Task GetRepositoriesAsync_NonSuccessStatus_ThrowsGitHubApiException()
        {
            var service = CreateService("""{ "message": "Bad credentials" }""", HttpStatusCode.Unauthorized);

            var ex = await Assert.ThrowsAsync<GitHubApiException>(() => service.GetRepositoriesAsync("bad"));

            Assert.Equal(HttpStatusCode.Unauthorized, ex.StatusCode);
            Assert.Contains("401", ex.Message);
            Assert.Contains("Bad credentials", ex.Message);
        }

        [Fact]
        public async Task GetRepositoriesAsync_ServerError_ThrowsGitHubApiException()
        {
            var service = CreateService("boom", HttpStatusCode.InternalServerError);

            var ex = await Assert.ThrowsAsync<GitHubApiException>(() => service.GetRepositoriesAsync("token-123"));

            Assert.Equal(HttpStatusCode.InternalServerError, ex.StatusCode);
        }

        // ---------- GetBranchesAsync ----------

        private const string BranchesResponse = """
        [
          { "name": "main", "commit": { "sha": "abc123" } },
          { "name": "develop", "commit": { "sha": "def456" } }
        ]
        """;

        [Fact]
        public async Task GetBranchesAsync_ParsesNameAndCommitSha()
        {
            var service = CreateService(BranchesResponse);

            var branches = await service.GetBranchesAsync("token-123", "acme", "api");

            Assert.Equal(2, branches.Count);
            Assert.Equal("main", branches[0].Name);
            Assert.Equal("abc123", branches[0].CommitSha);
            Assert.Equal("develop", branches[1].Name);
            Assert.Equal("def456", branches[1].CommitSha);
        }

        [Fact]
        public async Task GetBranchesAsync_UsesOwnerAndRepoInPath()
        {
            var service = CreateService(out var handler, BranchesResponse);

            await service.GetBranchesAsync("token-123", "acme", "api");

            Assert.Equal("/repos/acme/api/branches?per_page=100", handler.LastRequest!.RequestUri!.PathAndQuery);
            Assert.Equal("token-123", handler.LastRequest.Headers.Authorization!.Parameter);
        }

        [Fact]
        public async Task GetBranchesAsync_EmptyArray_ReturnsEmptyList()
        {
            var service = CreateService("[]");

            var branches = await service.GetBranchesAsync("token-123", "acme", "api");

            Assert.Empty(branches);
        }

        [Fact]
        public async Task GetBranchesAsync_NotFound_ThrowsGitHubApiException()
        {
            var service = CreateService("""{ "message": "Not Found" }""", HttpStatusCode.NotFound);

            var ex = await Assert.ThrowsAsync<GitHubApiException>(() => service.GetBranchesAsync("token-123", "acme", "missing"));

            Assert.Equal(HttpStatusCode.NotFound, ex.StatusCode);
        }

        // ---------- GetCommitsAsync ----------

        private const string CommitsResponse = """
        [
          {
            "sha": "abc123",
            "commit": {
              "message": "Fix login redirect",
              "author": { "name": "Ada Lovelace", "date": "2026-02-01T09:00:00Z" }
            }
          },
          {
            "sha": "def456",
            "commit": { "message": "Initial commit", "author": { "name": "Alan Turing" } }
          }
        ]
        """;

        [Fact]
        public async Task GetCommitsAsync_ParsesShaMessageAndAuthor()
        {
            var service = CreateService(CommitsResponse);

            var commits = await service.GetCommitsAsync("token-123", "acme", "api", "main");

            Assert.Equal(2, commits.Count);
            Assert.Equal("abc123", commits[0].Sha);
            Assert.Equal("Fix login redirect", commits[0].Message);
            Assert.Equal("Ada Lovelace", commits[0].AuthorName);
            Assert.NotNull(commits[0].Date);
        }

        [Fact]
        public async Task GetCommitsAsync_MissingAuthorDate_YieldsNullDate()
        {
            var service = CreateService(CommitsResponse);

            var commits = await service.GetCommitsAsync("token-123", "acme", "api", "main");

            Assert.Null(commits[1].Date);
            Assert.Equal("Alan Turing", commits[1].AuthorName);
        }

        [Fact]
        public async Task GetCommitsAsync_PassesBranchAsShaQueryParameter()
        {
            var service = CreateService(out var handler, CommitsResponse);

            await service.GetCommitsAsync("token-123", "acme", "api", "release/v2");

            Assert.Equal("/repos/acme/api/commits", handler.LastRequest!.RequestUri!.AbsolutePath);
            var query = handler.LastRequest.RequestUri.Query;
            Assert.Contains("sha=release/v2", query);
            Assert.Contains("per_page=100", query);
        }

        [Fact]
        public async Task GetCommitsAsync_EmptyArray_ReturnsEmptyList()
        {
            var service = CreateService("[]");

            var commits = await service.GetCommitsAsync("token-123", "acme", "api", "main");

            Assert.Empty(commits);
        }

        [Fact]
        public async Task GetCommitsAsync_RateLimited_ThrowsGitHubApiException()
        {
            var service = CreateService("""{ "message": "API rate limit exceeded" }""", HttpStatusCode.Forbidden);

            var ex = await Assert.ThrowsAsync<GitHubApiException>(() => service.GetCommitsAsync("token-123", "acme", "api", "main"));

            Assert.Equal(HttpStatusCode.Forbidden, ex.StatusCode);
            Assert.Contains("API rate limit exceeded", ex.Message);
        }

        [Fact]
        public void Constructor_SetsGitHubApiBaseAddressAndDefaultHeaders()
        {
            var handler = new FakeHttpMessageHandler("{}");
            var client = new HttpClient(handler);
            var unused = new GitHubService(client);

            Assert.Equal("https://api.github.com/", client.BaseAddress!.ToString());
            Assert.Contains("Harbor-App", client.DefaultRequestHeaders.GetValues("User-Agent"));
        }
    }
}
