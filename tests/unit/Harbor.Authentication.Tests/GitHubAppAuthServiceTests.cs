using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Services;
using Harbor.GitHub.Services;
using Moq;
using Xunit;

namespace Harbor.Authentication.Tests;

public class GitHubAppAuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IJwtService> _jwtServiceMock = new();
    private readonly Mock<IGitHubAppOAuthClient> _oauthClientMock = new();
    private readonly Mock<IGitHubAppApiClient> _appClientMock = new();
    private readonly Mock<IEncryptionService> _encryptionServiceMock = new();
    private readonly Mock<IGitHubAppInstallationProvider> _installationProviderMock = new();
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock = new();
    private readonly GitHubAppAuthService _service;

    public GitHubAppAuthServiceTests()
    {
        _service = new GitHubAppAuthService(
            _userRepoMock.Object,
            _jwtServiceMock.Object,
            _oauthClientMock.Object,
            _appClientMock.Object,
            _encryptionServiceMock.Object,
            _installationProviderMock.Object,
            _httpClientFactoryMock.Object);

        _jwtServiceMock.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns(("mock-jwt", DateTime.UtcNow.AddHours(2)));
        _encryptionServiceMock.Setup(e => e.Encrypt(It.IsAny<string>()))
            .Returns<string>(s => $"enc-{s}");
    }

    [Fact]
    public async Task StartAuthFlowAsync_MissingClientId_ReturnsNull()
    {
        Environment.SetEnvironmentVariable("GH_APP_CLIENT_ID", null);
        Environment.SetEnvironmentVariable("GITHUB_APP_CLIENT_ID", null);

        var result = await _service.StartAuthFlowAsync();
        Assert.Null(result);
    }

    [Fact]
    public async Task StartAuthFlowAsync_WithClientId_ReturnsStartResponse()
    {
        Environment.SetEnvironmentVariable("GH_APP_CLIENT_ID", "gh-client-123");
        try
        {
            _oauthClientMock.Setup(o => o.BuildAuthorizationUrl(It.IsAny<string>(), It.IsAny<string>()))
                .Returns("https://github.com/login/oauth/authorize?test=1");

            var result = await _service.StartAuthFlowAsync();
            Assert.NotNull(result);
            Assert.Equal("https://github.com/login/oauth/authorize?test=1", result.RedirectUrl);
            Assert.NotNull(result.State);
            Assert.NotNull(result.CodeVerifier);
        }
        finally
        {
            Environment.SetEnvironmentVariable("GH_APP_CLIENT_ID", null);
        }
    }

    [Fact]
    public async Task CompleteAuthFlowAsync_EmptyCodeOrState_ReturnsError()
    {
        var (success, error, data) = await _service.CompleteAuthFlowAsync("", "state", "verifier");
        Assert.False(success);
        Assert.Contains("Failed to exchange authorization code", error);
        Assert.Null(data);
    }

    [Fact]
    public async Task CompleteAuthFlowAsync_OAuthExchangeReturnsNull_ReturnsError()
    {
        _oauthClientMock.Setup(o => o.ExchangeCodeAsync("valid-code", "valid-verifier", "valid-state", It.IsAny<CancellationToken>()))
            .ReturnsAsync((OAuthTokenResponse?)null);

        var (success, error, data) = await _service.CompleteAuthFlowAsync("valid-code", "valid-state", "valid-verifier");
        Assert.False(success);
        Assert.Contains("Failed to exchange authorization code", error);
    }

    [Fact]
    public async Task CompleteAuthFlowAsync_ExistingExternalUser_LogsInSuccessfully()
    {
        _oauthClientMock.Setup(o => o.ExchangeCodeAsync("code", "verifier", "state", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthTokenResponse("gho_abc123"));
        _oauthClientMock.Setup(o => o.GetUserInfoAsync("gho_abc123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GitHubUserInfo { Id = 12345, Login = "octocat", Email = "octo@github.com" });
        _appClientMock.Setup(a => a.GetUserInstallationIdAsync("gho_abc123", It.IsAny<CancellationToken>()))
            .ReturnsAsync(9999L);

        var existing = new User { Id = 10, Username = "octocat", Email = "octo@github.com", Role = Roles.User };
        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "12345")).ReturnsAsync(existing);

        var (success, error, data) = await _service.CompleteAuthFlowAsync("code", "state", "verifier");

        Assert.True(success);
        Assert.NotNull(data);
        Assert.Equal("octocat", data.Username);
        _userRepoMock.Verify(r => r.SetGitHubInstallationAsync(10, 9999L), Times.Once);
    }

    [Fact]
    public async Task CompleteAuthFlowAsync_NewUser_RegistersSuccessfully()
    {
        _oauthClientMock.Setup(o => o.ExchangeCodeAsync("code", "verifier", "state", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthTokenResponse("gho_newuser"));
        _oauthClientMock.Setup(o => o.GetUserInfoAsync("gho_newuser", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GitHubUserInfo { Id = 77777, Login = "newbie", Email = "newbie@github.com" });
        _appClientMock.Setup(a => a.GetUserInstallationIdAsync("gho_newuser", It.IsAny<CancellationToken>()))
            .ReturnsAsync((long?)null);

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "77777")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("newbie@github.com")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.CreateUserAsync(It.IsAny<User>())).ReturnsAsync(55);

        var (success, error, data) = await _service.CompleteAuthFlowAsync("code", "state", "verifier");

        Assert.True(success);
        Assert.NotNull(data);
        Assert.Equal("newbie", data.Username);
        _userRepoMock.Verify(r => r.CreateUserAsync(It.Is<User>(u => u.Email == "newbie@github.com")), Times.Once);
        _userRepoMock.Verify(r => r.SetGitHubInstallationAsync(It.IsAny<int>(), It.IsAny<long>()), Times.Never);
    }

    [Fact]
    public async Task LinkAccountAsync_AlreadyLinkedToDifferentAccount_ReturnsError()
    {
        _oauthClientMock.Setup(o => o.ExchangeCodeAsync("code", "verifier", "state", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthTokenResponse("gho_token"));
        _oauthClientMock.Setup(o => o.GetUserInfoAsync("gho_token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GitHubUserInfo { Id = 88888, Login = "linkeduser", Email = "linked@github.com" });

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "88888"))
            .ReturnsAsync(new User { Id = 999, Username = "otheruser" });

        var (success, error) = await _service.LinkAccountAsync(123, "code", "state", "verifier");

        Assert.False(success);
        Assert.Contains("already linked to another Harbor account", error);
    }

    [Fact]
    public async Task LinkAccountAsync_ValidAccount_LinksSuccessfully()
    {
        _oauthClientMock.Setup(o => o.ExchangeCodeAsync("code", "verifier", "state", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OAuthTokenResponse("gho_token"));
        _oauthClientMock.Setup(o => o.GetUserInfoAsync("gho_token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GitHubUserInfo { Id = 88888, Login = "linkeduser", Email = "linked@github.com" });
        _appClientMock.Setup(a => a.GetUserInstallationIdAsync("gho_token", It.IsAny<CancellationToken>()))
            .ReturnsAsync(4321L);

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "88888"))
            .ReturnsAsync((User?)null);

        var (success, error) = await _service.LinkAccountAsync(123, "code", "state", "verifier");

        Assert.True(success);
        Assert.Null(error);
        _userRepoMock.Verify(r => r.AddExternalIdentityAsync(123, "github", "88888", "linked@github.com", "linkeduser", "enc-gho_token"), Times.Once);
        _userRepoMock.Verify(r => r.SetGitHubInstallationAsync(123, 4321L), Times.Once);
    }
}
