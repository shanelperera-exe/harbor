using Harbor.Contracts.Kafka;
using Xunit;

namespace Harbor.Common.Tests;

public class DeploymentLifecycleEventTests
{
    [Fact]
    public void DeploymentLifecycleEvent_Properties_CanBeSetAndRetrieved()
    {
        var now = DateTime.UtcNow;
        var evt = new DeploymentLifecycleEvent
        {
            DeploymentId = 42,
            ServiceId = "svc_123",
            Status = "Succeeded",
            Environment = "Production",
            Version = "v1.2.3",
            Timestamp = now,
            FailureReason = null
        };

        Assert.Equal(42, evt.DeploymentId);
        Assert.Equal("svc_123", evt.ServiceId);
        Assert.Equal("Succeeded", evt.Status);
        Assert.Equal("Production", evt.Environment);
        Assert.Equal("v1.2.3", evt.Version);
        Assert.Equal(now, evt.Timestamp);
        Assert.Null(evt.FailureReason);
    }
}
