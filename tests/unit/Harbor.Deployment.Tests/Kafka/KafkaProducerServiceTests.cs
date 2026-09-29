using Harbor.Contracts.Kafka;
using Harbor.Deployment.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests.Kafka;

public class KafkaProducerServiceTests
{
    [Fact]
    public void Constructor_MissingBootstrapServers_DoesNotThrow()
    {
        // Arrange
        var optionsMock = new Mock<IOptions<KafkaOptions>>();
        optionsMock.Setup(o => o.Value).Returns(new KafkaOptions { BootstrapServers = "" });
        var loggerMock = new Mock<ILogger<KafkaProducerService>>();

        // Act & Assert
        var service = new KafkaProducerService(optionsMock.Object, loggerMock.Object);
        Assert.NotNull(service);
    }

    [Fact]
    public async Task PublishDeploymentEventAsync_MissingBootstrapServers_DoesNotThrow()
    {
        // Arrange
        var optionsMock = new Mock<IOptions<KafkaOptions>>();
        optionsMock.Setup(o => o.Value).Returns(new KafkaOptions { BootstrapServers = "" });
        var loggerMock = new Mock<ILogger<KafkaProducerService>>();
        var service = new KafkaProducerService(optionsMock.Object, loggerMock.Object);

        // Act & Assert
        var exception = await Record.ExceptionAsync(() => service.PublishDeploymentEventAsync(new DeploymentLifecycleEvent()));
        Assert.Null(exception);
    }

    [Fact]
    public async Task PublishDeploymentEventAsync_MissingTopic_DoesNotThrow()
    {
        // Arrange
        var optionsMock = new Mock<IOptions<KafkaOptions>>();
        optionsMock.Setup(o => o.Value).Returns(new KafkaOptions { BootstrapServers = "localhost:9092", DeploymentTopic = "" });
        var loggerMock = new Mock<ILogger<KafkaProducerService>>();
        var service = new KafkaProducerService(optionsMock.Object, loggerMock.Object);

        // Act & Assert
        var exception = await Record.ExceptionAsync(() => service.PublishDeploymentEventAsync(new DeploymentLifecycleEvent()));
        Assert.Null(exception);
    }
}
