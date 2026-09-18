using System.Net.Http.Headers;
using System.Text.Json;

namespace Harbor.Project.Services
{
    public interface IGitHubService
    {
        Task<List<GitHubRepository>> GetRepositoriesAsync(string token);
        Task<List<GitHubBranch>> GetBranchesAsync(string token, string owner, string repo);
    }

    public class GitHubRepository
    {
        public string Name { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string HtmlUrl { get; set; } = string.Empty;
        public string CloneUrl { get; set; } = string.Empty;
        public bool Private { get; set; }
    }

    public class GitHubBranch
    {
        public string Name { get; set; } = string.Empty;
        public string CommitSha { get; set; } = string.Empty;
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
            var request = new HttpRequestMessage(HttpMethod.Get, "user/repos?sort=updated&per_page=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return new List<GitHubRepository>();
            }

            var content = await response.Content.ReadAsStringAsync();
            using var document = JsonDocument.Parse(content);
            var repos = new List<GitHubRepository>();

            foreach (var element in document.RootElement.EnumerateArray())
            {
                repos.Add(new GitHubRepository
                {
                    Name = element.GetProperty("name").GetString() ?? string.Empty,
                    FullName = element.GetProperty("full_name").GetString() ?? string.Empty,
                    HtmlUrl = element.GetProperty("html_url").GetString() ?? string.Empty,
                    CloneUrl = element.GetProperty("clone_url").GetString() ?? string.Empty,
                    Private = element.GetProperty("private").GetBoolean()
                });
            }

            return repos;
        }

        public async Task<List<GitHubBranch>> GetBranchesAsync(string token, string owner, string repo)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"repos/{owner}/{repo}/branches?per_page=100");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                return new List<GitHubBranch>();
            }

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
    }
}
