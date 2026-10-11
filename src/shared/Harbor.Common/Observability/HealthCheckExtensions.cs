using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Harbor.Common.Observability;

/// <summary>
/// Configures standardized health endpoints (/health, /health/live, /health/ready)
/// and JSON response serialization.
/// Scenario 1: Service Health Information.
/// </summary>
public static class HealthCheckExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Adds default Harbor liveness check tag to health checks builder.
    /// </summary>
    public static IHealthChecksBuilder AddHarborLiveness(this IHealthChecksBuilder builder, string serviceName)
    {
        builder.AddCheck("self", () => HealthCheckResult.Healthy($"{serviceName} is running"), tags: new[] { "live" });
        return builder;
    }

    /// <summary>
    /// Adds a readiness check verifying database connectivity by executing SELECT 1.
    /// </summary>
    public static IHealthChecksBuilder AddHarborDbCheck<TFactory>(
        this IHealthChecksBuilder builder,
        Func<TFactory, System.Data.Common.DbConnection> connectionAccessor,
        string name = "database") where TFactory : class
    {
        builder.Add(new HealthCheckRegistration(
            name,
            sp => new DelegateHealthCheck(async (ctx, ct) =>
            {
                try
                {
                    var factory = sp.GetService<TFactory>();
                    if (factory == null) return HealthCheckResult.Healthy("Database factory not registered");
                    await using var conn = connectionAccessor(factory);
                    await conn.OpenAsync(ct);
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT 1";
                    await cmd.ExecuteScalarAsync(ct);
                    return HealthCheckResult.Healthy("Database connection verified");
                }
                catch (Exception ex)
                {
                    return HealthCheckResult.Unhealthy($"Database connection failed: {ex.Message}");
                }
            }),
            failureStatus: HealthStatus.Unhealthy,
            tags: new[] { "ready" }));

        return builder;
    }

    /// <summary>
    /// Adds a readiness check verifying database connectivity by executing SELECT 1 against a registered DbDataSource.
    /// </summary>
    public static IHealthChecksBuilder AddHarborDataSourceCheck(
        this IHealthChecksBuilder builder,
        string name = "database")
    {
        builder.Add(new HealthCheckRegistration(
            name,
            sp => new DelegateHealthCheck(async (ctx, ct) =>
            {
                try
                {
                    var ds = sp.GetService<System.Data.Common.DbDataSource>();
                    if (ds == null) return HealthCheckResult.Healthy("DbDataSource not registered");
                    await using var conn = await ds.OpenConnectionAsync(ct);
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT 1";
                    await cmd.ExecuteScalarAsync(ct);
                    return HealthCheckResult.Healthy("Database connection verified");
                }
                catch (Exception ex)
                {
                    return HealthCheckResult.Unhealthy($"Database connection failed: {ex.Message}");
                }
            }),
            failureStatus: HealthStatus.Unhealthy,
            tags: new[] { "ready" }));

        return builder;
    }

    /// <summary>
    /// Adds a readiness check verifying distributed cache (Redis) availability.
    /// </summary>
    public static IHealthChecksBuilder AddHarborCacheCheck(
        this IHealthChecksBuilder builder,
        string name = "redis")
    {
        builder.Add(new HealthCheckRegistration(
            name,
            sp => new DelegateHealthCheck(async (ctx, ct) =>
            {
                try
                {
                    var cache = sp.GetService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>();
                    if (cache == null) return HealthCheckResult.Healthy("Cache not registered");
                    await cache.GetAsync("__health_ping__", ct);
                    return HealthCheckResult.Healthy("Redis cache is accessible");
                }
                catch (Exception ex)
                {
                    return HealthCheckResult.Degraded($"Redis cache unreachable: {ex.Message}");
                }
            }),
            failureStatus: HealthStatus.Degraded,
            tags: new[] { "ready" }));

        return builder;
    }

    /// <summary>
    /// Maps /health, /health/live, and /health/ready endpoints with standardized responses.
    /// </summary>
    public static IEndpointRouteBuilder MapHarborHealthChecks(this IEndpointRouteBuilder endpoints)
    {
        // 1. Liveness probe - returns fast 200 OK if service process is responding
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("live"),
            ResponseWriter = WriteLivenessResponse
        });

        // 2. Readiness probe - verifies critical dependencies (DB, Redis, Kafka)
        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains("ready") || check.Tags.Contains("live"),
            ResponseWriter = WriteDetailedResponse
        });

        // 3. Aggregated status endpoint - evaluates all checks
        endpoints.MapHealthChecks("/health", new HealthCheckOptions
        {
            ResponseWriter = WriteDetailedResponse
        });

        return endpoints;
    }

    private static Task WriteLivenessResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var isHealthy = report.Status == HealthStatus.Healthy;
        context.Response.StatusCode = isHealthy ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;

        var json = JsonSerializer.Serialize(new
        {
            status = report.Status.ToString()
        }, JsonOptions);

        return context.Response.WriteAsync(json);
    }

    private static Task WriteDetailedResponse(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var isHealthy = report.Status == HealthStatus.Healthy || report.Status == HealthStatus.Degraded;
        context.Response.StatusCode = isHealthy ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;

        var result = new
        {
            status = report.Status.ToString(),
            totalDuration = report.TotalDuration.ToString(),
            entries = report.Entries.ToDictionary(
                kvp => kvp.Key,
                kvp => new
                {
                    status = kvp.Value.Status.ToString(),
                    duration = kvp.Value.Duration.ToString(),
                    description = kvp.Value.Description ?? string.Empty,
                    data = kvp.Value.Data
                })
        };

        var json = JsonSerializer.Serialize(result, JsonOptions);
        return context.Response.WriteAsync(json);
    }
}

internal sealed class DelegateHealthCheck : IHealthCheck
{
    private readonly Func<HealthCheckContext, System.Threading.CancellationToken, Task<HealthCheckResult>> _check;

    public DelegateHealthCheck(Func<HealthCheckContext, System.Threading.CancellationToken, Task<HealthCheckResult>> check)
    {
        _check = check;
    }

    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, System.Threading.CancellationToken cancellationToken = default)
        => _check(context, cancellationToken);
}
