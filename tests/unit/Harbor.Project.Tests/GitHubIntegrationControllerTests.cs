using System.Net;
using System.Security.Claims;
using Harbor.Project.Controllers;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class GitHubIntegrationControllerTests
{
    private readonly Mock<IGitHubService> _gitHubServiceMock = new();
    private readonly Mock<ITokenService> _tokenServiceMock = new();
    private readonly Mock<ILogger<GitHubIntegrationController>> _loggerMock = new();
    private readonly GitHubIntegrationController _controller;

    public GitHubIntegrationControllerTests()
    {
        _controller = new GitHubIntegrationController(
            _gitHubServiceMock.Object,
            _tokenServiceMock.Object,
            _loggerMock.Object);
        SetUser("10");
    }

    private void SetUser(string? userId)
    {
        var claims = new List<Claim>();
        if (userId != null) claims.Add(new Claim("userId", userId));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, userId != null ? "mock" : null))
            }
        };
    }

    [Fact]
    public async Task GetRepositories_NoUserId_ReturnsUnauthorized()
    {
        SetUser(null);
        var result = await _controller.GetRepositories();
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetRepositories_TokenNotConnected_ReturnsBadRequest()
    {
        var tokenResult = GitHubTokenResult.NotConnected("GitHub account is not connected.");
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);

        var result = await _controller.GetRepositories();
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetRepositories_TokenCredentialFailure_Returns502()
    {
        var tokenResult = GitHubTokenResult.Failed("App private key invalid.");
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);

        var result = await _controller.GetRepositories();
        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetRepositories_OAuthFallback_LogsWarningAndReturnsUserRepos()
    {
        var tokenResult = new GitHubTokenResult
        {
            Token = "oauth-tok",
            Source = GitHubTokenSource.UserOAuth,
            InstallationTokenFailure = "Installation token failed"
        };
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);
        var repos = new List<GitHubRepository> { new() { Id = 1, Name = "repo1" } };
        _gitHubServiceMock.Setup(g => g.GetUserRepositoriesAsync("oauth-tok")).ReturnsAsync(repos);

        var result = await _controller.GetRepositories();
        var ok = Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetRepositories_AppToken_ReturnsRepos()
    {
        var tokenResult = GitHubTokenResult.Success("app-tok", GitHubTokenSource.Installation);
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);
        var repos = new List<GitHubRepository> { new() { Id = 2, Name = "repo2" } };
        _gitHubServiceMock.Setup(g => g.GetRepositoriesAsync("app-tok")).ReturnsAsync(repos);

        var result = await _controller.GetRepositories();
        var ok = Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetRepositories_GitHubApiException_PreservesStatusCode()
    {
        var tokenResult = GitHubTokenResult.Success("app-tok", GitHubTokenSource.Installation);
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);
        _gitHubServiceMock.Setup(g => g.GetRepositoriesAsync("app-tok"))
            .ThrowsAsync(new GitHubApiException(HttpStatusCode.Forbidden, "Rate limit exceeded"));

        var result = await _controller.GetRepositories();
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, statusResult.StatusCode);
    }

    [Fact]
    public async Task GetBranches_Success_ReturnsBranches()
    {
        var tokenResult = GitHubTokenResult.Success("app-tok", GitHubTokenSource.Installation);
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);
        var branches = new List<GitHubBranch> { new() { Name = "main" } };
        _gitHubServiceMock.Setup(g => g.GetBranchesAsync("app-tok", "owner", "repo")).ReturnsAsync(branches);

        var result = await _controller.GetBranches("owner", "repo");
        var ok = Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetCommits_Success_ReturnsCommits()
    {
        var tokenResult = GitHubTokenResult.Success("app-tok", GitHubTokenSource.Installation);
        _tokenServiceMock.Setup(t => t.GetGitHubTokenResultAsync(10)).ReturnsAsync(tokenResult);
        var commits = new List<GitHubCommit> { new() { Sha = "abc", Message = "initial commit" } };
        _gitHubServiceMock.Setup(g => g.GetCommitsAsync("app-tok", "owner", "repo", "main")).ReturnsAsync(commits);

        var result = await _controller.GetCommits("owner", "repo", "main");
        var ok = Assert.IsType<OkObjectResult>(result);
    }
}
