using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Harbor.Project.Services
{
    public interface IGitHubService
    {
        Task<List<GitHubRepository>> GetRepositoriesAsync(string token);
        Task<List<GitHubBranch>> GetBranchesAsync(string token, string owner, string repo);
        Task<List<GitHubCommit>> GetCommitsAsync(string token, string owner, string repo, string branch);
    }

    public class GitHubRepository
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Owner { get; set; } = string.Empty;
        public string HtmlUrl { get; set; } = string.Empty;
        public string CloneUrl { get; set; } = string.Empty;
        public bool Private { get; set; }
        public string DefaultBranch { get; set; } = string.Empty;
        public DateTime? UpdatedAt { get; set; }
    }

    public class GitHubBranch
    {
        public string Name { get; set; } = string.Empty;
        public string CommitSha { get; set; } = string.Empty;
    }

    public class GitHubCommit
    {
        public string Sha { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public DateTime? Date { get; set; }
    }

    public class GitHubService : IGitHubService
    {
        private readonly HttpClient _httpClient;

        public GitHubService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.BaseAddress = new Uri("https://api.github.com/");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "Harbor-App");
            _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github.v3+json"));
        }

        public async Task<List<GitHubRepository>> GetRepositoriesAsync(string token)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "installation/repositories?per_page=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return new List<GitHubRepository>();

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            var repos = new List<GitHubRepository>();

            if (!document.RootElement.TryGetProperty("repositories", out var reposElement))
                return repos;

            foreach (var element in reposElement.EnumerateArray())
            {
                var ownerElement = element.GetProperty("owner");
                repos.Add(new GitHubRepository
                {
                    Id = element.GetProperty("id").GetInt64(),
                    Name = element.GetProperty("name").GetString() ?? string.Empty,
                    FullName = element.GetProperty("full_name").GetString() ?? string.Empty,
                    Owner = ownerElement.GetProperty("login").GetString() ?? string.Empty,
                    HtmlUrl = element.GetProperty("html_url").GetString() ?? string.Empty,
                    CloneUrl = element.GetProperty("clone_url").GetString() ?? string.Empty,
                    Private = element.GetProperty("private").GetBoolean(),
                    DefaultBranch = element.TryGetProperty("default_branch", out var db) ? db.GetString() ?? "main" : "main",
                    UpdatedAt = element.TryGetProperty("updated_at", out var ua) && ua.ValueKind != JsonValueKind.Null ? ua.GetDateTime() : null
                });
            }

            return repos;
        }

        public async Task<List<GitHubBranch>> GetBranchesAsync(string token, string owner, string repo)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"repos/{owner}/{repo}/branches?per_page=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return new List<GitHubBranch>();

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            var branches = new List<GitHubBranch>();

            foreach (var element in document.RootElement.EnumerateArray())
            {
                var commit = element.GetProperty("commit");
                branches.Add(new GitHubBranch
                {
                    Name = element.GetProperty("name").GetString() ?? string.Empty,
                    CommitSha = commit.GetProperty("sha").GetString() ?? string.Empty
                });
            }

            return branches;
        }

        public async Task<List<GitHubCommit>> GetCommitsAsync(string token, string owner, string repo, string branch)
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, $"repos/{owner}/{repo}/commits?sha={branch}&per_page=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                return new List<GitHubCommit>();

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            var commits = new List<GitHubCommit>();

            foreach (var element in document.RootElement.EnumerateArray())
            {
                var commitInfo = element.GetProperty("commit");
                var authorInfo = commitInfo.GetProperty("author");

                commits.Add(new GitHubCommit
                {
                    Sha = element.GetProperty("sha").GetString() ?? string.Empty,
                    Message = commitInfo.GetProperty("message").GetString() ?? string.Empty,
                    AuthorName = authorInfo.GetProperty("name").GetString() ?? string.Empty,
                    Date = authorInfo.TryGetProperty("date", out var d) && d.ValueKind != JsonValueKind.Null ? d.GetDateTime() : null
                });
            }

            return commits;
        }
    }
}
