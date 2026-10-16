using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Harbor.Common.Observability;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Common.Tests;

public class MetricsEndpointGuardMiddlewareTests
{
    private readonly Mock<ILogger<MetricsEndpointGuardMiddleware>> _loggerMock = new();
    private readonly Mock<IHostEnvironment> _envMock = new();

    private MetricsEndpointGuardMiddleware CreateMiddleware(
        RequestDelegate next,
        Dictionary<string, string?> configValues,
        string environment = "Production")
    {
        _envMock.Setup(e => e.EnvironmentName).Returns(environment);
        var config = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();
        return new MetricsEndpointGuardMiddleware(next, config, _envMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task NonMetricsPath_PassesThroughToNext()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>());

        var context = new DefaultHttpContext();
        context.Request.Path = "/api/projects";

        await middleware.InvokeAsync(context);
        Assert.True(nextCalled);
    }

    [Fact]
    public async Task MetricsPath_WhenTokenConfiguredAndValidTokenProvided_PassesThrough()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>
        {
            ["METRICS_SCRAPE_TOKEN"] = "my-secret-scrape-token"
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";
        context.Request.Headers.Authorization = "Bearer my-secret-scrape-token";

        await middleware.InvokeAsync(context);
        Assert.True(nextCalled);
        Assert.NotEqual(404, context.Response.StatusCode);
    }

    [Fact]
    public async Task MetricsPath_WhenTokenConfiguredAndWrongTokenProvided_Returns404()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>
        {
            ["METRICS_SCRAPE_TOKEN"] = "my-secret-scrape-token"
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";
        context.Request.Headers.Authorization = "Bearer wrong-token";

        await middleware.InvokeAsync(context);
        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
    }

    [Fact]
    public async Task MetricsPath_WhenTokenConfiguredAndNotBearer_Returns404()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>
        {
            ["METRICS_SCRAPE_TOKEN"] = "my-secret-scrape-token"
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";
        context.Request.Headers.Authorization = "Basic dXNlcjpwYXNz";

        await middleware.InvokeAsync(context);
        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
    }

    [Fact]
    public async Task MetricsPath_WhenTokenConfiguredAndNoHeader_Returns404()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>
        {
            ["METRICS_SCRAPE_TOKEN"] = "my-secret-scrape-token"
        });

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";

        await middleware.InvokeAsync(context);
        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
    }

    [Fact]
    public async Task MetricsPath_WhenNoTokenInDevelopment_PassesThrough()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>(), environment: "Development");

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";

        await middleware.InvokeAsync(context);
        Assert.True(nextCalled);
    }

    [Fact]
    public async Task MetricsPath_WhenNoTokenAndAllowAnonymousTrue_PassesThrough()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>
        {
            ["METRICS_ALLOW_ANONYMOUS"] = "true"
        }, environment: "Production");

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";

        await middleware.InvokeAsync(context);
        Assert.True(nextCalled);
    }

    [Fact]
    public async Task MetricsPath_WhenNoTokenInProductionWithoutAllowAnonymous_Returns404()
    {
        var nextCalled = false;
        var middleware = CreateMiddleware(ctx =>
        {
            nextCalled = true;
            return Task.CompletedTask;
        }, new Dictionary<string, string?>(), environment: "Production");

        var context = new DefaultHttpContext();
        context.Request.Path = "/metrics";

        await middleware.InvokeAsync(context);
        Assert.False(nextCalled);
        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
    }
}
