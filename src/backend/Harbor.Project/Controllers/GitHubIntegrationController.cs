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
        private readonly ILogger<GitHubIntegrationController> _logger;

        public GitHubIntegrationController(
            IGitHubService gitHubService,
            ITokenService tokenService,
            ILogger<GitHubIntegrationController> logger)
        {
            _gitHubService = gitHubService;
            _tokenService = tokenService;
            _logger = logger;
        }

        [HttpGet("repositories")]
        public async Task<IActionResult> GetRepositories()
        {
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var tokenResult = await _tokenService.GetGitHubTokenResultAsync(userId);
            if (!tokenResult.HasToken)
            {
                return TokenFailure(tokenResult);
            }

            if (tokenResult.Source == GitHubTokenSource.UserOAuth && tokenResult.InstallationTokenFailure is not null)
            {
                _logger.LogWarning(
                    "Falling back to the account's GitHub OAuth token; the GitHub App installation token " +
                    "was unavailable: {Reason}",
                    tokenResult.InstallationTokenFailure);
            }

            try
            {
                var repos = tokenResult.Source == GitHubTokenSource.UserOAuth
                    ? await _gitHubService.GetUserRepositoriesAsync(tokenResult.Token!)
                    : await _gitHubService.GetRepositoriesAsync(tokenResult.Token!);
                return Ok(new { Data = repos });
            }
            catch (GitHubApiException ex)
            {
                return StatusCode((int)ex.StatusCode, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Reports why the installation token is unavailable. A missing installation is a 400 the
        /// user can fix; anything else is a server-side credential problem and must not masquerade
        /// as "not connected".
        /// </summary>
        private IActionResult TokenFailure(GitHubTokenResult tokenResult)
        {
            if (tokenResult.IsNotConnected)
            {
                return BadRequest(new { message = tokenResult.FailureReason });
            }

            _logger.LogError(
                "GitHub installation token unavailable: {Reason}",
                tokenResult.FailureReason);

            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "Harbor could not obtain a GitHub installation token from GitHub.",
                detail = tokenResult.FailureReason
            });
        }

        [HttpGet("repositories/{owner}/{repo}/branches")]
        public async Task<IActionResult> GetBranches(string owner, string repo)
        {
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var tokenResult = await _tokenService.GetGitHubTokenResultAsync(userId);
            if (!tokenResult.HasToken)
            {
                return TokenFailure(tokenResult);
            }

            try
            {
                var branches = await _gitHubService.GetBranchesAsync(tokenResult.Token!, owner, repo);
                return Ok(new { Data = branches });
            }
            catch (GitHubApiException ex)
            {
                return StatusCode((int)ex.StatusCode, new { message = ex.Message });
            }
        }

        [HttpGet("repositories/{owner}/{repo}/branches/{branch}/commits")]
        public async Task<IActionResult> GetCommits(string owner, string repo, string branch)
        {
            if (!int.TryParse(User.FindFirstValue("userId"), out var userId))
            {
                return Unauthorized();
            }

            var tokenResult = await _tokenService.GetGitHubTokenResultAsync(userId);
            if (!tokenResult.HasToken)
            {
                return TokenFailure(tokenResult);
            }

            try
            {
                var commits = await _gitHubService.GetCommitsAsync(tokenResult.Token!, owner, repo, branch);
                return Ok(new { Data = commits });
            }
            catch (GitHubApiException ex)
            {
                return StatusCode((int)ex.StatusCode, new { message = ex.Message });
            }
        }
    }
}
