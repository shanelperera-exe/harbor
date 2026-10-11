using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Prometheus;

namespace Harbor.Common.Observability;

/// <summary>
/// Extension methods for configuring the standard Harbor Observability pipeline.
/// </summary>
public static class HarborObservabilityExtensions
{
    /// <summary>
    /// Adds Correlation ID, Global Exception Handling, and Prometheus HTTP metrics middleware to the HTTP request pipeline.
    /// Should be placed near the beginning of the pipeline.
    /// </summary>
    public static IApplicationBuilder UseHarborObservability(this IApplicationBuilder app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<GlobalExceptionHandlingMiddleware>();
        app.UseHttpMetrics();
        return app;
    }

    /// <summary>
    /// Maps standardized health checks (/health, /health/live, /health/ready) and Prometheus metrics (/metrics).
    /// </summary>
    public static IEndpointRouteBuilder MapHarborObservability(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHarborHealthChecks();
        endpoints.MapMetrics();
        return endpoints;
    }
}
