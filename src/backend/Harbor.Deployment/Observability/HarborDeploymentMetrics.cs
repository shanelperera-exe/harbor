using Prometheus;

namespace Harbor.Deployment.Observability;

/// <summary>
/// Prometheus custom domain metrics for Harbor deployment operations and lifecycle events.
/// </summary>
public static class HarborDeploymentMetrics
{
    public static readonly Counter DeploymentsTotal = Metrics.CreateCounter(
        "harbor_deployment_operations_total",
        "Total number of deployment operations processed by Harbor",
        new CounterConfiguration
        {
            LabelNames = new[] { "environment", "status" }
        });

    public static readonly Histogram DeploymentDurationSeconds = Metrics.CreateHistogram(
        "harbor_deployment_duration_seconds",
        "Duration of deployment operations in seconds",
        new HistogramConfiguration
        {
            LabelNames = new[] { "environment", "status" },
            Buckets = Histogram.ExponentialBuckets(start: 1, factor: 2, count: 8)
        });
}
