#nullable enable

using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Harbor.Common.Observability;

/// <summary>
/// Protects the Prometheus <c>/metrics</c> endpoint.
/// <list type="bullet">
///   <item>If <c>METRICS_SCRAPE_TOKEN</c> is configured, requests must send
///   <c>Authorization: Bearer &lt;token&gt;</c> (compared in constant time).</item>
///   <item>If no token is configured, anonymous scraping is only allowed in the Development
///   environment or when <c>METRICS_ALLOW_ANONYMOUS=true</c> (local docker-compose).</item>
///   <item>Otherwise the endpoint fails closed and responds 404 so its existence is not advertised.</item>
/// </list>
/// </summary>
public sealed class MetricsEndpointGuardMiddleware
{
    private static readonly PathString MetricsPath = new("/metrics");

    private readonly RequestDelegate _next;
    private readonly ILogger<MetricsEndpointGuardMiddleware> _logger;
    private readonly byte[]? _expectedTokenHash;
    private readonly bool _allowAnonymous;

    public MetricsEndpointGuardMiddleware(
        RequestDelegate next,
        IConfiguration configuration,
        IHostEnvironment environment,
        ILogger<MetricsEndpointGuardMiddleware> logger)
    {
        _next = next;
        _logger = logger;

        var token = configuration["METRICS_SCRAPE_TOKEN"];
        if (!string.IsNullOrWhiteSpace(token))
        {
            _expectedTokenHash = SHA256.HashData(Encoding.UTF8.GetBytes(token.Trim()));
        }

        _allowAnonymous = _expectedTokenHash is null &&
            (environment.IsDevelopment() ||
             string.Equals(configuration["METRICS_ALLOW_ANONYMOUS"], "true", StringComparison.OrdinalIgnoreCase));

        if (_expectedTokenHash is null && !_allowAnonymous)
        {
            _logger.LogWarning(
                "METRICS_SCRAPE_TOKEN is not configured; /metrics is disabled for this instance.");
        }
    }

    public Task InvokeAsync(HttpContext context)
    {
        if (!context.Request.Path.StartsWithSegments(MetricsPath))
        {
            return _next(context);
        }

        if (_allowAnonymous || IsAuthorized(context.Request))
        {
            return _next(context);
        }

        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return Task.CompletedTask;
    }

    private bool IsAuthorized(HttpRequest request)
    {
        if (_expectedTokenHash is null)
        {
            return false;
        }

        var header = request.Headers.Authorization.ToString();
        const string scheme = "Bearer ";
        if (!header.StartsWith(scheme, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Hash both sides so the comparison is fixed-length and constant-time.
        var presented = SHA256.HashData(Encoding.UTF8.GetBytes(header[scheme.Length..].Trim()));
        return CryptographicOperations.FixedTimeEquals(presented, _expectedTokenHash);
    }
}
