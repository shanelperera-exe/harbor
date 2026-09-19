using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using Harbor.Project.Services;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/projects/githubintegration")]
    [Authorize]
    public class GitHubIntegrationController : ControllerBase
    {
        private readonly IGitHubService _gitHubService;
        private readonly ITokenService _tokenService;

        public GitHubIntegrationController(IGitHubService gitHubService, ITokenService tokenService)
        {
            _gitHubService = gitHubService;
            _tokenService = tokenService;
        }

        [HttpGet("repositories")]
        public async Task<IActionResult> GetRepositories()
        {
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var token = await _tokenService.GetGitHubTokenAsync(userId);
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { message = "GitHub account not connected or token missing." });
            }

            var repos = await _gitHubService.GetRepositoriesAsync(token);
            return Ok(new { Data = repos });
        }

        [HttpGet("repositories/{owner}/{repo}/branches")]
        public async Task<IActionResult> GetBranches(string owner, string repo)
        {
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var token = await _tokenService.GetGitHubTokenAsync(userId);
            if (string.IsNullOrWhiteSpace(token))
            {
                return BadRequest(new { message = "GitHub account not connected or token missing." });
            }

            var branches = await _gitHubService.GetBranchesAsync(token, owner, repo);
            return Ok(new { Data = branches });
        }
    }
}
