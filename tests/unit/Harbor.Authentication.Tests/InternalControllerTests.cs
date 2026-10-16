using Harbor.Authentication.Controllers;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Services;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Harbor.Authentication.Tests;

public class InternalControllerTests
{
    private readonly Mock<IUserRepository> _repoMock = new();
    private readonly Mock<IEncryptionService> _encryptionMock = new();
    private readonly Mock<IGitHubAppInstallationProvider> _installationMock = new();
    private readonly GitHubAppOptions _appOptions = new() { AppId = 12345 };
    private readonly InternalController _controller;

    public InternalControllerTests()
    {
        _controller = new InternalController(
            _repoMock.Object,
            _encryptionMock.Object,
            _installationMock.Object,
            Options.Create(_appOptions));
    }

    [Fact]
    public async Task GetExternalToken_UserNotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((User?)null);

        var result = await _controller.GetExternalToken(1, "github");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetExternalToken_NoToken_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new User { Id = 1 });
        _repoMock.Setup(r => r.GetExternalAccessTokenAsync(1, "github")).ReturnsAsync((string?)null);

        var result = await _controller.GetExternalToken(1, "github");

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetExternalToken_GitHubProvider_DecryptsAndReturns()
    {
        _repoMock.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(new User { Id = 1 });
        _repoMock.Setup(r => r.GetExternalAccessTokenAsync(1, "github")).ReturnsAsync("encrypted-token");
        _encryptionMock.Setup(e => e.Decrypt("encrypted-token")).Returns("decrypted-token");

        var result = await _controller.GetExternalToken(1, "github");

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetInstallationToken_NoInstallation_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetGitHubInstallationAsync(1)).ReturnsAsync((long?)null);

        var result = await _controller.GetInstallationToken(1);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetInstallationToken_Success_ReturnsToken()
    {
        _repoMock.Setup(r => r.GetGitHubInstallationAsync(1)).ReturnsAsync(99999L);
        _installationMock.Setup(i => i.GetInstallationTokenAsync(99999L, default))
            .ReturnsAsync(new InstallationToken("ghs_token123", DateTime.UtcNow.AddHours(1)));

        var result = await _controller.GetInstallationToken(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetUserInstallations_NotConnected_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.GetExternalAccessTokenAsync(1, "github")).ReturnsAsync((string?)null);

        var result = await _controller.GetUserInstallations(1);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetUserInstallations_Success_ReturnsList()
    {
        _repoMock.Setup(r => r.GetExternalAccessTokenAsync(1, "github")).ReturnsAsync("enc-token");
        _encryptionMock.Setup(e => e.Decrypt("enc-token")).Returns("token");
        _installationMock.Setup(i => i.GetUserInstallationsDetailAsync("token", default))
            .ReturnsAsync(new List<GitHubInstallation>
            {
                new(123, "test-org", "Organization", "https://github.com/orgs/test-org")
            });

        var result = await _controller.GetUserInstallations(1);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }
}
