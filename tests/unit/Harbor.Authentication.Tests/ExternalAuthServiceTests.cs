using System.Security.Claims;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Services;
using Moq;
using Xunit;

namespace Harbor.Authentication.Tests;

public class ExternalAuthServiceTests
{
    private readonly Mock<IUserRepository> _userRepoMock = new();
    private readonly Mock<IJwtService> _jwtServiceMock = new();
    private readonly ExternalAuthService _service;

    public ExternalAuthServiceTests()
    {
        _service = new ExternalAuthService(_userRepoMock.Object, _jwtServiceMock.Object);
        _jwtServiceMock.Setup(j => j.GenerateToken(It.IsAny<User>()))
            .Returns(("mock.jwt.token", DateTime.UtcNow.AddHours(1)));
    }

    [Fact]
    public async Task LoginOrRegisterAsync_MissingProviderUserId_ReturnsError()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Email, "user@example.com")
        }));

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "github");

        Assert.False(success);
        Assert.Contains("stable user identifier", error);
        Assert.Null(data);
    }

    [Fact]
    public async Task LoginOrRegisterAsync_MissingEmail_ReturnsError()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "12345")
        }));

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "github");

        Assert.False(success);
        Assert.Contains("email address", error);
        Assert.Null(data);
    }

    [Fact]
    public async Task LoginOrRegisterAsync_ExistingExternalIdentity_ReturnsLoginResponse()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "gh-101"),
            new Claim(ClaimTypes.Email, "alice@example.com"),
            new Claim(ClaimTypes.Name, "alice")
        }));

        var existingUser = new User
        {
            Id = 42,
            Username = "alice",
            Email = "alice@example.com",
            Role = Roles.User,
            AvatarSvg = "<svg></svg>"
        };

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "gh-101"))
            .ReturnsAsync(existingUser);

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "github", "token_123");

        Assert.True(success);
        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("alice", data.Username);
        Assert.Equal("mock.jwt.token", data.Token);

        _userRepoMock.Verify(r => r.AddExternalLoginMethodAsync(42, "github"), Times.Once);
        _userRepoMock.Verify(r => r.AddExternalIdentityAsync(42, "github", "gh-101", "alice@example.com", "alice", "token_123"), Times.Once);
    }

    [Fact]
    public async Task LoginOrRegisterAsync_ExistingUserByEmail_LinksAndReturnsLoginResponse()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("sub", "google-sub-202"),
            new Claim("email", "bob@example.com")
        }));

        var existingUser = new User
        {
            Id = 15,
            Username = "bob",
            Email = "bob@example.com",
            Role = Roles.Admin
        };

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("google", "google-sub-202"))
            .ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("bob@example.com"))
            .ReturnsAsync(existingUser);

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "google");

        Assert.True(success);
        Assert.NotNull(data);
        Assert.Equal("bob", data.Username);
        _userRepoMock.Verify(r => r.AddExternalLoginMethodAsync(15, "google"), Times.Once);
    }

    [Fact]
    public async Task LoginOrRegisterAsync_NewUser_UsernameCollision_AppendsGuidAndCreates()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "9999"),
            new Claim(ClaimTypes.Email, "carol@example.com"),
            new Claim("name", "carol!")
        }));

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "9999")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("carol@example.com")).ReturnsAsync((User?)null);
        // Collision for "carol"
        _userRepoMock.Setup(r => r.GetByUsernameAsync("carol")).ReturnsAsync(new User { Id = 1, Username = "carol" });
        _userRepoMock.Setup(r => r.CreateUserAsync(It.IsAny<User>())).ReturnsAsync(88);

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "github");

        Assert.True(success);
        Assert.NotNull(data);
        Assert.StartsWith("carol-", data.Username);
        _userRepoMock.Verify(r => r.CreateUserAsync(It.Is<User>(u => u.Email == "carol@example.com")), Times.Once);
    }

    [Fact]
    public async Task LoginOrRegisterAsync_NewUser_EmptyAlphanumericUsername_UsesFallback()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "8888"),
            new Claim(ClaimTypes.Email, "!@#$%@example.com"),
            new Claim("login", "!!!@@@###")
        }));

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "8888")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.GetByEmailAsync("!@#$%@example.com")).ReturnsAsync((User?)null);
        _userRepoMock.Setup(r => r.CreateUserAsync(It.IsAny<User>())).ReturnsAsync(99);

        var (success, error, data) = await _service.LoginOrRegisterAsync(principal, "github");

        Assert.True(success);
        Assert.NotNull(data);
        Assert.StartsWith("user-", data.Username);
    }

    [Fact]
    public async Task LinkAsync_MissingProviderUserId_ReturnsError()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity());
        var (success, error) = await _service.LinkAsync(1, principal, "github");

        Assert.False(success);
        Assert.Contains("stable user identifier", error);
    }

    [Fact]
    public async Task LinkAsync_AccountAlreadyLinkedToDifferentUser_ReturnsError()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "gh-999")
        }));

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "gh-999"))
            .ReturnsAsync(new User { Id = 456, Username = "different_user" });

        var (success, error) = await _service.LinkAsync(123, principal, "github");

        Assert.False(success);
        Assert.Contains("already linked to another Harbor account", error);
    }

    [Fact]
    public async Task LinkAsync_ValidAccount_LinksSuccessfully()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "gh-999"),
            new Claim(ClaimTypes.Email, "my@email.com"),
            new Claim(ClaimTypes.Name, "myusername")
        }));

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("github", "gh-999"))
            .ReturnsAsync((User?)null);

        var (success, error) = await _service.LinkAsync(123, principal, "github", "gh_token");

        Assert.True(success);
        Assert.Null(error);
        _userRepoMock.Verify(r => r.AddExternalIdentityAsync(123, "github", "gh-999", "my@email.com", "myusername", "gh_token"), Times.Once);
        _userRepoMock.Verify(r => r.AddExternalLoginMethodAsync(123, "github"), Times.Once);
    }

    [Fact]
    public async Task LinkAsync_ValidAccount_InvalidatesProfileCache()
    {
        var cacheMock = new Mock<Harbor.Caching.ICacheService>();
        var serviceWithCache = new ExternalAuthService(_userRepoMock.Object, _jwtServiceMock.Object, cacheMock.Object);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "google-123"),
            new Claim(ClaimTypes.Email, "my@email.com")
        }));

        _userRepoMock.Setup(r => r.GetByExternalIdentityAsync("google", "google-123"))
            .ReturnsAsync((User?)null);

        var (success, _) = await serviceWithCache.LinkAsync(777, principal, "google");

        Assert.True(success);
        cacheMock.Verify(c => c.RemoveAsync("auth:user:777", It.IsAny<CancellationToken>()), Times.Once);
    }
}
