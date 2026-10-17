using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Harbor.Common.Observability;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Common.Tests;

public class ObservabilityMiddlewareTests
{
    [Fact]
    public async Task CorrelationIdMiddleware_WhenHeaderPresent_UsesExistingCorrelationId()
    {
        var existingCorrelationId = "custom-trace-id-12345";
        var context = new DefaultHttpContext();
        context.Request.Headers[CorrelationIdMiddleware.CorrelationIdHeader] = existingCorrelationId;

        var loggerMock = new Mock<ILogger<CorrelationIdMiddleware>>();
        var nextCalled = false;
        RequestDelegate next = ctx =>
        {
            nextCalled = true;
            Assert.Equal(existingCorrelationId, ctx.Items[CorrelationIdMiddleware.CorrelationIdItemKey]);
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next, loggerMock.Object);
        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
        Assert.Equal(existingCorrelationId, context.TraceIdentifier);
    }

    [Fact]
    public async Task CorrelationIdMiddleware_WhenHeaderMissing_GeneratesNewGuidCorrelationId()
    {
        var context = new DefaultHttpContext();

        var loggerMock = new Mock<ILogger<CorrelationIdMiddleware>>();
        var nextCalled = false;
        RequestDelegate next = ctx =>
        {
            nextCalled = true;
            var generatedId = ctx.Items[CorrelationIdMiddleware.CorrelationIdItemKey]?.ToString();
            Assert.False(string.IsNullOrWhiteSpace(generatedId));
            Assert.True(Guid.TryParse(generatedId, out _));
            return Task.CompletedTask;
        };

        var middleware = new CorrelationIdMiddleware(next, loggerMock.Object);
        await middleware.InvokeAsync(context);

        Assert.True(nextCalled);
    }

    [Fact]
    public async Task GlobalExceptionHandlingMiddleware_InterceptsExceptionAndReturnsProblemDetailsWithScrubbedMessage()
    {
        var context = new DefaultHttpContext();
        var responseBodyStream = new MemoryStream();
        context.Response.Body = responseBodyStream;
        context.Items[CorrelationIdMiddleware.CorrelationIdItemKey] = "corr-error-trace-999";

        var loggerMock = new Mock<ILogger<GlobalExceptionHandlingMiddleware>>();
        RequestDelegate next = _ => throw new InvalidOperationException("Failed query with password=SuperSecretPassword123!");

        var middleware = new GlobalExceptionHandlingMiddleware(next, loggerMock.Object);
        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal("application/problem+json", context.Response.ContentType);

        responseBodyStream.Seek(0, SeekOrigin.Begin);
        var jsonDocument = await JsonDocument.ParseAsync(responseBodyStream);
        var root = jsonDocument.RootElement;

        Assert.Equal(500, root.GetProperty("status").GetInt32());
        Assert.Equal("corr-error-trace-999", root.GetProperty("traceId").GetString());
        Assert.Equal("HARBOR_ERR_INTERNAL", root.GetProperty("errorCode").GetString());

        var detail = root.GetProperty("detail").GetString();
        Assert.NotNull(detail);
        Assert.DoesNotContain("SuperSecretPassword123!", detail);
        Assert.Contains("password=[REDACTED]", detail);
    }

    [Fact]
    public async Task GlobalExceptionHandlingMiddleware_WhenOriginHeaderPresent_SetsCorsHeadersOnProblemDetails()
    {
        var context = new DefaultHttpContext();
        context.Request.Headers["Origin"] = "https://harborapp.tech";
        var responseBodyStream = new MemoryStream();
        context.Response.Body = responseBodyStream;

        var loggerMock = new Mock<ILogger<GlobalExceptionHandlingMiddleware>>();
        RequestDelegate next = _ => throw new Exception("Unexpected service failure");

        var middleware = new GlobalExceptionHandlingMiddleware(next, loggerMock.Object);
        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        Assert.Equal("https://harborapp.tech", context.Response.Headers["Access-Control-Allow-Origin"]);
        Assert.Equal("true", context.Response.Headers["Access-Control-Allow-Credentials"]);
        Assert.Equal("Origin", context.Response.Headers["Vary"]);
    }
}
