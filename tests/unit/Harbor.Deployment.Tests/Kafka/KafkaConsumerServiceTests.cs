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

    private class TestableKafkaConsumerService : KafkaConsumerService
    {
        public TestableKafkaConsumerService(IOptions<KafkaOptions> options, ILogger<KafkaConsumerService> logger, IServiceScopeFactory scopeFactory)
            : base(options, logger, scopeFactory) { }

        public Task RunExecuteAsync(CancellationToken token) => ExecuteAsync(token);
    }

    [Theory]
    // Terminal states -> always null
    [InlineData("Successful", "DeploymentStarted", null)]
    [InlineData("Successful", "Running", null)]
    [InlineData("Successful", "DeploymentSucceeded", null)]
    [InlineData("Successful", "Succeeded", null)]
    [InlineData("Successful", "Successful", null)]
    [InlineData("Successful", "DeploymentFailed", null)]
    [InlineData("Successful", "Failed", null)]
    [InlineData("Successful", "UnknownEvent", null)]
    [InlineData("Succeeded", "DeploymentStarted", null)]
    [InlineData("Succeeded", "Running", null)]
    [InlineData("Succeeded", "DeploymentSucceeded", null)]
    [InlineData("Succeeded", "Succeeded", null)]
    [InlineData("Succeeded", "Successful", null)]
    [InlineData("Succeeded", "DeploymentFailed", null)]
    [InlineData("Succeeded", "Failed", null)]
    [InlineData("Succeeded", "UnknownEvent", null)]
    [InlineData("Failed", "DeploymentStarted", null)]
    [InlineData("Failed", "Running", null)]
    [InlineData("Failed", "DeploymentSucceeded", null)]
    [InlineData("Failed", "Succeeded", null)]
    [InlineData("Failed", "Successful", null)]
    [InlineData("Failed", "DeploymentFailed", null)]
    [InlineData("Failed", "Failed", null)]
    [InlineData("Failed", "UnknownEvent", null)]
    // Running state transitions
    [InlineData("Running", "DeploymentStarted", null)]
    [InlineData("Running", "Running", null)]
    [InlineData("Running", "DeploymentSucceeded", "Successful")]
    [InlineData("Running", "Succeeded", "Successful")]
    [InlineData("Running", "Successful", "Successful")]
    [InlineData("Running", "DeploymentFailed", "Failed")]
    [InlineData("Running", "Failed", "Failed")]
    [InlineData("Running", "UnknownEvent", null)]
    // Pending / Queued / Other state transitions
    [InlineData("Pending", "DeploymentStarted", "Running")]
    [InlineData("Pending", "Running", "Running")]
    [InlineData("Pending", "DeploymentSucceeded", "Successful")]
    [InlineData("Pending", "Succeeded", "Successful")]
    [InlineData("Pending", "Successful", "Successful")]
    [InlineData("Pending", "DeploymentFailed", "Failed")]
    [InlineData("Pending", "Failed", "Failed")]
    [InlineData("Pending", "UnknownEvent", null)]
    [InlineData("Queued", "DeploymentStarted", "Running")]
    [InlineData("Queued", "Running", "Running")]
    [InlineData("Queued", "DeploymentSucceeded", "Successful")]
    [InlineData("Queued", "Succeeded", "Successful")]
    [InlineData("Queued", "Successful", "Successful")]
    [InlineData("Queued", "DeploymentFailed", "Failed")]
    [InlineData("Queued", "Failed", "Failed")]
    [InlineData("Queued", "UnknownEvent", null)]
    public void DetermineNewState_AllPermutations_ReturnsExpected(string currentStatus, string eventStatus, string? expected)
    {
        var result = _service.DetermineNewState(currentStatus, eventStatus);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("", "deployments", "group1")]
    [InlineData("   ", "deployments", "group1")]
    [InlineData(null, "deployments", "group1")]
    [InlineData("localhost:9092", "", "group1")]
    [InlineData("localhost:9092", "  ", "group1")]
    [InlineData("localhost:9092", null, "group1")]
    [InlineData("localhost:9092", "deployments", "")]
    [InlineData("localhost:9092", "deployments", "  ")]
    [InlineData("localhost:9092", "deployments", null)]
    public async Task ExecuteAsync_IncompleteConfig_SkipsService(string? servers, string? topic, string? group)
    {
        var optionsMock = new Mock<IOptions<KafkaOptions>>();
        optionsMock.Setup(o => o.Value).Returns(new KafkaOptions
        {
            BootstrapServers = servers!,
            DeploymentTopic = topic!,
            ConsumerGroupId = group!
        });

        var testService = new TestableKafkaConsumerService(optionsMock.Object, _loggerMock.Object, _scopeFactoryMock.Object);
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));
        await testService.RunExecuteAsync(cts.Token);
        // Should complete immediately without throwing
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

    [Fact]
    public async Task ProcessEventAsync_DeserializationReturnsNull_LogsWarningAndCompletes()
    {
        // Empty JSON object deserializes to object with default values, not null
        // But we can test with "null" string
        await _service.ProcessEventAsync("null", CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_DeploymentEventNullAfterDeserialization_LogsWarningAndCompletes()
    {
        // Empty object {} deserializes to DeploymentLifecycleEvent with default values
        // DeploymentId will be 0, which is handled by the DeploymentId <= 0 check
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent());
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_RepositoryThrows_LogsErrorAndCompletes()
    {
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ThrowsAsync(new Exception("DB connection failed"));
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.GetEntityByIdAsync(10), Times.Once);
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
    }

    [Fact]
    public async Task ProcessEventAsync_UpdateStatusReturnsFalse_DoesNotRetry()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Pending" };
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _deploymentRepositoryMock.Setup(r => r.UpdateStatusAsync(10, "Running", null)).ReturnsAsync(false);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(10, "Running", null), Times.Once);
    }

    [Fact]
    public async Task ProcessEventAsync_SucceededEvent_UpdatesToSuccessful()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Running" };
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _deploymentRepositoryMock.Setup(r => r.UpdateStatusAsync(10, "Successful", null)).ReturnsAsync(true);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentSucceeded" });
        
        await _service.ProcessEventAsync(json, CancellationToken.None);
        
        _deploymentRepositoryMock.Verify(r => r.UpdateStatusAsync(10, "Successful", null), Times.Once);
    }

    [Fact]
    public async Task ProcessEventAsync_CancellationToken_HandledGracefully()
    {
        var deployment = new DeploymentEntity { Id = 10, Status = "Pending" };
        _deploymentRepositoryMock.Setup(r => r.GetEntityByIdAsync(10)).ReturnsAsync(deployment);
        _deploymentRepositoryMock.Setup(r => r.UpdateStatusAsync(10, "Running", null)).ReturnsAsync(true);
        
        var json = JsonSerializer.Serialize(new DeploymentLifecycleEvent { DeploymentId = 10, Status = "DeploymentStarted" });
        
        var cts = new CancellationTokenSource();
        cts.Cancel();
        
        // Should not throw even with cancelled token
        await _service.ProcessEventAsync(json, cts.Token);
        
        // The operation may or may not complete depending on timing, but should not throw
    }
}
