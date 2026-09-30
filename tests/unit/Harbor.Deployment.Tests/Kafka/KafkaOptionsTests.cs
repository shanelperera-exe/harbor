using Harbor.Deployment.Kafka;
using Xunit;

namespace Harbor.Deployment.Tests.Kafka;

public class KafkaOptionsTests
{
    // A realistic-looking but entirely synthetic Event Hubs connection string.
    // No real credentials are present; the key value is a placeholder.
    private const string FakeConnectionString =
        "Endpoint=sb://harbor-eventhubs-test.servicebus.windows.net/;" +
        "SharedAccessKeyName=RootManageSharedAccessKey;" +
        "SharedAccessKey=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=;" +
        "EntityPath=deployments";

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsSaslUsernameToLiteral()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal("$ConnectionString", options.SaslUsername);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsSaslPasswordToFullConnectionString()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal(FakeConnectionString, options.SaslPassword);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsSecurityProtocolToSaslSsl()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal("SaslSsl", options.SecurityProtocol);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsSaslMechanismToPlain()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal("Plain", options.SaslMechanism);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsCorrectBootstrapServers()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal("harbor-eventhubs-test.servicebus.windows.net:9093", options.BootstrapServers);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_SetsCorrectDeploymentTopic()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.Equal("deployments", options.DeploymentTopic);
    }

    [Fact]
    public void ApplyConnectionString_EventHubsConnectionString_IsConfiguredReturnsTrue()
    {
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.True(options.IsConfigured);
    }

    [Fact]
    public void ApplyConnectionString_Empty_LeavesOptionsUnchanged()
    {
        var options = new KafkaOptions { ConnectionString = string.Empty };
        options.ApplyConnectionString();

        // Without a connection string, individual settings remain as-is (local dev path).
        Assert.Equal(string.Empty, options.SaslUsername);
        Assert.Equal(string.Empty, options.SaslPassword);
        Assert.Equal("Plaintext", options.SecurityProtocol);
        Assert.Equal("Plain", options.SaslMechanism);
    }

    [Fact]
    public void ApplyConnectionString_DoesNotSetSaslPasswordToSharedAccessKeyOnly()
    {
        // Regression: the old (broken) implementation set SaslPassword to just the
        // SharedAccessKey value, not the full connection string. Verify it is never
        // set to the raw key fragment in isolation.
        const string rawKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.NotEqual(rawKey, options.SaslPassword);
    }

    [Fact]
    public void ApplyConnectionString_DoesNotSetSaslUsernameToSharedAccessKeyName()
    {
        // Regression: the old (broken) implementation set SaslUsername to the
        // SharedAccessKeyName ("RootManageSharedAccessKey"), not "$ConnectionString".
        var options = new KafkaOptions { ConnectionString = FakeConnectionString };
        options.ApplyConnectionString();

        Assert.NotEqual("RootManageSharedAccessKey", options.SaslUsername);
    }
}
