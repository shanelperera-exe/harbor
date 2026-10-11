using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Harbor.Common.Observability;

/// <summary>
/// Middleware to propagate or generate an X-Correlation-ID header across HTTP requests,
/// response headers, and logger scopes for end-to-end tracing.
/// Scenario 2 & 3: Operational Diagnostics and Error Troubleshooting.
/// </summary>
public class CorrelationIdMiddleware
{
    public const string CorrelationIdHeader = "X-Correlation-ID";
    public const string CorrelationIdItemKey = "CorrelationId";

    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = context.Request.Headers[CorrelationIdHeader].ToString();

        if (string.IsNullOrWhiteSpace(correlationId))
        {
            correlationId = Guid.NewGuid().ToString("D");
        }

        context.Items[CorrelationIdItemKey] = correlationId;
        context.TraceIdentifier = correlationId;

        // Apply correlation ID to response headers
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(CorrelationIdHeader))
            {
                context.Response.Headers[CorrelationIdHeader] = correlationId;
            }
            return Task.CompletedTask;
        });

        // Enrich the logging scope for all loggers executed within this HTTP request pipeline
        using (_logger.BeginScope(new Dictionary<string, object>
        {
            [CorrelationIdItemKey] = correlationId
        }))
        {
            await _next(context);
        }
    }
}
