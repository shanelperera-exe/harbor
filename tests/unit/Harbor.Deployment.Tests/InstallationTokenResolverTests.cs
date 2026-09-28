using System.Net;
using System.Text;
using Harbor.Deployment.Services;
using Microsoft.Extensions.Options;
using Xunit;

namespace Harbor.Deployment.Tests;

/// <summary>Fake handler that returns a canned response and records the request.</summary>
public sealed class FakeHttpMessageHandler : HttpMessageHandler
{
    private readonly HttpStatusCode _statusCode;
    private readonly string _body;

    public HttpRequestMessage? LastRequest { get; private set; }
    public string? LastRequestBody { get; private set; }
    public int CallCount { get; private set; }

    public FakeHttpMessageHandler(string body, HttpStatusCode statusCode = HttpStatusCode.OK)
    {
        _statusCode = statusCode;
        _body = body;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        CallCount++;
        LastRequest = request;
        if (request.Content != null)
            LastRequestBody = await request.Content.ReadAsStringAsync(cancellationToken);

        return new HttpResponseMessage(_statusCode)
        {
            Content = new StringContent(_body, Encoding.UTF8, "application/json")
        };
    }
}

/// <summary>
/// <see cref="InstallationTokenResolver"/> fetches a short-lived GitHub App installation
/// token from the authentication service. These tests cover the success path, the
/// non-success fallbacks, and the default URL used when configuration is absent.
/// </summary>
public class InstallationTokenResolverTests
{
    private const string AuthServiceUrl = "http://auth.test:8080";

    private static InstallationTokenResolver CreateResolver(
        out FakeHttpMessageHandler handler,
        string body,
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string? authServiceClientUrl = AuthServiceUrl)
    {
        handler = new FakeHttpMessageHandler(body, statusCode);
        var options = Options.Create(new GitHubActionsOptions
        {
            AuthServiceClientUrl = authServiceClientUrl
        });

        return new InstallationTokenResolver(new HttpClient(handler), options);
    }

    [Fact]
    public async Task GetInstallationTokenAsync_SuccessResponse_ReturnsToken()
    {
        var resolver = CreateResolver(out _, """{ "token": "ghs_installation_token" }""");

        var token = await resolver.GetInstallationTokenAsync(7);

        Assert.Equal("ghs_installation_token", token);
    }

    [Fact]
    public async Task GetInstallationTokenAsync_CallsInternalAuthEndpointForUser()
    {
        var resolver = CreateResolver(out var handler, """{ "token": "ghs_installation_token" }""");

        await resolver.GetInstallationTokenAsync(42);

        Assert.Equal(1, handler.CallCount);
        Assert.Equal(HttpMethod.Get, handler.LastRequest!.Method);
        Assert.Equal(
            $"{AuthServiceUrl}/api/internal/users/42/installation-token",
            handler.LastRequest.RequestUri!.ToString());
    }

    [Fact]
    public async Task GetInstallationTokenAsync_NotFound_ReturnsNull()
    {
        var resolver = CreateResolver(out _, "not found", HttpStatusCode.NotFound);

        Assert.Null(await resolver.GetInstallationTokenAsync(7));
    }

    [Fact]
    public async Task GetInstallationTokenAsync_ServerError_ReturnsNull()
    {
        var resolver = CreateResolver(out _, "boom", HttpStatusCode.InternalServerError);

        Assert.Null(await resolver.GetInstallationTokenAsync(7));
    }

    [Fact]
    public async Task GetInstallationTokenAsync_Unauthorized_ReturnsNull()
    {
        var resolver = CreateResolver(out _, "unauthorized", HttpStatusCode.Unauthorized);

        Assert.Null(await resolver.GetInstallationTokenAsync(7));
    }

    [Fact]
    public async Task GetInstallationTokenAsync_ResponseWithoutTokenProperty_ReturnsNull()
    {
        var resolver = CreateResolver(out _, """{ "message": "no installation" }""");

        Assert.Null(await resolver.GetInstallationTokenAsync(7));
    }

    [Fact]
    public async Task GetInstallationTokenAsync_IgnoresExpiryFieldAndReturnsTokenOnly()
    {
        var resolver = CreateResolver(
            out _,
            """{ "token": "ghs_token", "expiresAt": "2026-06-01T12:00:00Z" }""");

        Assert.Equal("ghs_token", await resolver.GetInstallationTokenAsync(7));
    }

    [Fact]
    public async Task GetInstallationTokenAsync_UsesConfiguredAuthServiceUrl()
    {
        var handler = new FakeHttpMessageHandler("""{ "token": "ghs_token" }""");
        var options = Options.Create(new GitHubActionsOptions
        {
            AuthServiceClientUrl = "http://custom-auth:9000"
        });
        var resolver = new InstallationTokenResolver(new HttpClient(handler), options);

        await resolver.GetInstallationTokenAsync(7);

        Assert.Equal(
            "http://custom-auth:9000/api/internal/users/7/installation-token",
            handler.LastRequest!.RequestUri!.ToString());
    }

    [Fact]
    public async Task GetInstallationTokenAsync_WithoutConfiguredUrl_FallsBackToDockerServiceName()
    {
        var resolver = CreateResolver(
            out var handler,
            """{ "token": "ghs_token" }""",
            authServiceClientUrl: null);

        await resolver.GetInstallationTokenAsync(7);

        Assert.Equal("authentication-service", handler.LastRequest!.RequestUri!.Host);
        Assert.Equal(8080, handler.LastRequest.RequestUri.Port);
    }
}
