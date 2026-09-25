using System.Text.Json;
using Confluent.Kafka;
using Harbor.Contracts.Kafka;
using Harbor.Deployment.Kafka;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests.Kafka;

public class KafkaConsumerServiceTests
{
    private readonly Mock<IOptions<KafkaOptions>> _optionsMock = new();
    private readonly Mock<ILogger<KafkaConsumerService>> _loggerMock = new();
    private readonly Mock<IServiceScopeFactory> _scopeFactoryMock = new();
    private readonly Mock<IServiceScope> _scopeMock = new();
    private readonly Mock<IServiceProvider> _serviceProviderMock = new();
    private readonly Mock<IDeploymentRepository> _deploymentRepositoryMock = new();
    private readonly KafkaConsumerService _service;

    public KafkaConsumerServiceTests()
    {
        _optionsMock.Setup(o => o.Value).Returns(new KafkaOptions
        {
            BootstrapServers = "localhost:9092",
            DeploymentTopic = "deployments",
            ConsumerGroupId = "test-group"
        });

        _scopeFactoryMock.Setup(sf => sf.CreateScope()).Returns(_scopeMock.Object);
        _scopeMock.Setup(s => s.ServiceProvider).Returns(_serviceProviderMock.Object);
        _serviceProviderMock.Setup(sp => sp.GetService(typeof(IDeploymentRepository))).Returns(_deploymentRepositoryMock.Object);
        
        _service = new KafkaConsumerService(_optionsMock.Object, _loggerMock.Object, _scopeFactoryMock.Object);
    }

    [Fact]
    public void DetermineNewState_DeploymentStarted_FromPending_ReturnsRunning()
    {
        var result = _service.DetermineNewState("Pending", "DeploymentStarted");
        Assert.Equal("Running", result);
    }

    [Fact]
    public void DetermineNewState_DeploymentSucceeded_FromRunning_ReturnsSuccessful()
    {
        var result = _service.DetermineNewState("Running", "DeploymentSucceeded");
        Assert.Equal("Successful", result);
    }

    [Fact]
    public void DetermineNewState_DeploymentFailed_FromRunning_ReturnsFailed()
    {
        var result = _service.DetermineNewState("Running", "DeploymentFailed");
        Assert.Equal("Failed", result);
    }

    [Fact]
    public void DetermineNewState_DeploymentStarted_FromRunning_ReturnsNull_DuplicateEvent()
    {
        var result = _service.DetermineNewState("Running", "DeploymentStarted");
        Assert.Null(result); // Already running
    }

    [Theory]
    [InlineData("Successful")]
    [InlineData("Failed")]
    public void DetermineNewState_AnyEvent_FromTerminalState_ReturnsNull(string currentStatus)
    {
        Assert.Null(_service.DetermineNewState(currentStatus, "DeploymentStarted"));
        Assert.Null(_service.DetermineNewState(currentStatus, "DeploymentSucceeded"));
        Assert.Null(_service.DetermineNewState(currentStatus, "DeploymentFailed"));
    }

    [Fact]
    public void DetermineNewState_UnknownEvent_ReturnsNull()
    {
        var result = _service.DetermineNewState("Pending", "SomeRandomEvent");
        Assert.Null(result);
    }

    [Fact]
    public async Task ProcessEventAsync_InvalidJson_LogsErrorAndCompletes()
    {
        await _service.ProcessEventAsync("{ invalid json", CancellationToken.None);
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_MissingDeploymentId_LogsWarningAndCompletes()
    {
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 0, Status = "DeploymentStarted" });
        await _service.ProcessEventAsync(json, CancellationToken.None);
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_DeploymentNotFound_LogsWarningAndCompletes()
    {
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync((DeploymentEntity?)null);
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(10), Times.Once);
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_ValidEventAndTransition_UpdatesStatus()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Pending" };
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _deploymentRepositoryMock.Setup(r => r.UpdateStatusAsync(10, "Running", null)).ReturnsAsync(true);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(10, "Running", null), Times.Once);
    }

    [Fact]
    public async Task ProcessEventAsync_FailedEvent_UpdatesStatusWithFailureReason()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Running" };
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _deploymentRepositoryMock.Setup(r => r.UpdateStatusAsync(10, "Failed", "Out of memory")).ReturnsAsync(true);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentFailed", FailureReason = "Out of memory" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(10, "Failed", "Out of memory"), Times.Once);
    }

    [Fact]
    public async Task ProcessEventAsync_InvalidTransition_DoesNotUpdateStatus()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Successful" }; // Terminal state
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(10), Times.Once);
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }
}
