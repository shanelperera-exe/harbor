using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Harbor.Common.Observability;

/// <summary>
/// Global exception handling middleware producing RFC 7807 ProblemDetails responses,
/// structured error logs, and safe sanitized error messages without secret leakage.
/// Scenario 3: Error Troubleshooting & Scenario 4: Sensitive Information Protection.
/// </summary>
public class GlobalExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var correlationId = context.Items[CorrelationIdMiddleware.CorrelationIdItemKey]?.ToString()
            ?? context.TraceIdentifier;

        var sanitizedMessage = HarborSensitiveDataScrubber.Scrub(ex.Message);
        var path = context.Request.Path.Value ?? "/";
        var method = context.Request.Method;

        // Structured server log with correlation tracking and scrubbed message
        _logger.LogError(
            ex,
            "Unhandled exception processing {Method} {Path}. CorrelationId: {CorrelationId}. Error: {SanitizedError}",
            method,
            path,
            correlationId,
            sanitizedMessage);

        var statusCode = StatusCodes.Status500InternalServerError;
        var errorCode = "HARBOR_ERR_INTERNAL";
        var title = "An unexpected error occurred";

        // Map known framework or specific exceptions if appropriate
        if (ex is BadHttpRequestException)
        {
            statusCode = StatusCodes.Status400BadRequest;
            errorCode = "HARBOR_ERR_BAD_REQUEST";
            title = "Invalid Request";
        }
        else if (ex is UnauthorizedAccessException)
        {
            statusCode = StatusCodes.Status401Unauthorized;
            errorCode = "HARBOR_ERR_UNAUTHORIZED";
            title = "Unauthorized";
        }

        var problemDetails = new ProblemDetails
        {
            Type = $"https://harborapp.tech/errors/{errorCode.ToLowerInvariant().Replace('_', '-')}",
            Title = title,
            Status = statusCode,
            Detail = sanitizedMessage,
            Instance = path
        };

        problemDetails.Extensions["traceId"] = correlationId;
        problemDetails.Extensions["errorCode"] = errorCode;
        problemDetails.Extensions["timestamp"] = DateTime.UtcNow;

        if (!context.Response.HasStarted &&
            context.Request.Headers.TryGetValue("Origin", out var origin) &&
            !string.IsNullOrEmpty(origin))
        {
            context.Response.Headers["Access-Control-Allow-Origin"] = origin.ToString();
            context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
            context.Response.Headers["Vary"] = "Origin";
        }

        context.Response.ContentType = "application/problem+json";
        context.Response.StatusCode = statusCode;

        await JsonSerializer.SerializeAsync(context.Response.Body, problemDetails, JsonOptions);
    }
}
