using System.Security.Claims;
using Harbor.Caching;
using Harbor.Caching.Middleware;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;

namespace Harbor.Common.Tests;

public class TokenBlacklistMiddlewareTests
{
    private readonly Mock<ICacheService> _cacheMock;
    private bool _nextCalled;
    private readonly RequestDelegate _next;

    public TokenBlacklistMiddlewareTests()
    {
        _cacheMock = new Mock<ICacheService>();
        _nextCalled = false;
        _next = (ctx) =>
        {
            _nextCalled = true;
            return Task.CompletedTask;
        };
    }

    [Fact]
    public async Task InvokeAsync_WhenUnauthenticated_CallsNext()
    {
        var middleware = new TokenBlacklistMiddleware(_next);
        var context = new DefaultHttpContext();

        await middleware.InvokeAsync(context, _cacheMock.Object);

        Assert.True(_nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenAuthenticatedWithoutJti_CallsNext()
    {
        var middleware = new TokenBlacklistMiddleware(_next);
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "alice") }, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        await middleware.InvokeAsync(context, _cacheMock.Object);

        Assert.True(_nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenJtiNotRevoked_CallsNext()
    {
        var middleware = new TokenBlacklistMiddleware(_next);
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, "alice"),
            new Claim("jti", "token-xyz-123")
        }, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        _cacheMock.Setup(c => c.GetAsync<bool>(CacheKeys.AuthRevokedToken("token-xyz-123"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await middleware.InvokeAsync(context, _cacheMock.Object);

        Assert.True(_nextCalled);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_WhenJtiIsRevoked_Returns401AndDoesNotCallNext()
    {
        var middleware = new TokenBlacklistMiddleware(_next);
        var context = new DefaultHttpContext();
        var identity = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.Name, "alice"),
            new Claim("jti", "revoked-token-456")
        }, "TestAuth");
        context.User = new ClaimsPrincipal(identity);

        _cacheMock.Setup(c => c.GetAsync<bool>(CacheKeys.AuthRevokedToken("revoked-token-456"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await middleware.InvokeAsync(context, _cacheMock.Object);

        Assert.False(_nextCalled);
        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }
}
