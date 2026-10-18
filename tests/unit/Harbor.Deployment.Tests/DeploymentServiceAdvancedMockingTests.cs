using System.Collections;
using System.Collections.Generic;
using Harbor.Contracts.Kafka;
using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Harbor.Deployment.Kafka;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

/// <summary>
/// Student 1: Advanced Unit Testing & Mocking Suite
/// Demonstrates:
///   1. Parameterized testing with [Theory], [InlineData], and [MemberData].
///   2. Test Doubles (Mocks, Stubs, Spies) isolating Harbor.Deployment logic.
///   3. Verification of behavioral invariants (Times.Once, Times.Never, parameter predicates).
///   4. Error isolation, boundary values, and transient failure simulations.
/// </summary>
public class DeploymentServiceAdvancedMockingTests
{
    private readonly Mock<IDeploymentRepository> _mockRepository;
    private readonly Mock<IGitHubActionsClient> _mockGitHubClient;
    private readonly Mock<IInstallationTokenResolver> _mockTokenResolver;
    private readonly Mock<IKafkaProducerService> _mockKafkaProducer;
    private readonly Mock<ILogger<DeploymentService>> _mockLogger;
    private readonly IOptions<GitHubActionsOptions> _options;
    private readonly DeploymentService _service;

    public DeploymentServiceAdvancedMockingTests()
    {
        // Arrange Test Doubles
        _mockRepository = new Mock<IDeploymentRepository>(MockBehavior.Strict);
        _mockGitHubClient = new Mock<IGitHubActionsClient>(MockBehavior.Strict);
        _mockTokenResolver = new Mock<IInstallationTokenResolver>(MockBehavior.Loose);
        _mockKafkaProducer = new Mock<IKafkaProducerService>(MockBehavior.Strict);
        _mockLogger = new Mock<ILogger<DeploymentService>>(MockBehavior.Loose);

        _options = Options.Create(new GitHubActionsOptions
        {
            DefaultWorkflowFile = "harbor-deploy.yml",
            ApiBaseUrl = "https://api.github.com"
        });

        _service = new DeploymentService(
            _mockRepository.Object,
            _mockGitHubClient.Object,
            _options,
            _mockTokenResolver.Object,
            _mockKafkaProducer.Object,
            _mockLogger.Object
        );
    }

    #region 1. Parameterized Boundary & Clamping Tests [Theory]

    public static IEnumerable<object[]> PaginationBoundaryData()
    {
        // QueryPage, QueryPageSize, ExpectedClampedPage, ExpectedClampedPageSize
        yield return new object[] { 1, 20, 1, 20 };
        yield return new object[] { 0, 50, 1, 50 };       // Lower page clamp
        yield return new object[] { -10, 30, 1, 30 };     // Negative page clamp
        yield return new object[] { 5, 0, 5, 1 };         // Lower pageSize clamp
        yield return new object[] { 2, -1, 2, 1 };        // Negative pageSize clamp
        yield return new object[] { 3, 100, 3, 100 };     // Upper boundary
        yield return new object[] { 4, 150, 4, 100 };     // Max clamp at 100
        yield return new object[] { 1, 9999, 1, 100 };    // Extreme upper clamp
    }

    [Theory]
    [MemberData(nameof(PaginationBoundaryData))]
    public async Task GetHistoryAsync_PaginationBoundaries_AlwaysClampedToValidRange(
        int inputPage, int inputPageSize, int expectedPage, int expectedPageSize)
    {
        // Arrange
        const int ownerId = 42;
        var query = new DeploymentHistoryQuery
        {
            Page = inputPage,
            PageSize = inputPageSize,
            Environment = "production"
        };

        var dummyEntities = new List<DeploymentEntity>
        {
            new()
            {
                Id = 1,
                OwnerId = ownerId,
                ServiceId = 101,
                Environment = "production",
                Version = "1.0.0",
                Status = "Succeeded",
                StartedAt = DateTime.UtcNow
            }
        };

        int expectedOffset = (expectedPage - 1) * expectedPageSize;

        _mockRepository
            .Setup(r => r.GetHistoryAsync(ownerId, null, "production", null, null, expectedOffset, expectedPageSize, false))
            .ReturnsAsync((dummyEntities, 1));

        // Act
        var result = await _service.GetHistoryAsync(ownerId, query, isAdmin: false);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedPage, result.Page);
        Assert.Equal(expectedPageSize, result.PageSize);
        Assert.Single(result.Items);

        _mockRepository.Verify(
            r => r.GetHistoryAsync(ownerId, null, "production", null, null, expectedOffset, expectedPageSize, false),
            Times.Once);
    }

    [Theory]
    [InlineData("Pending", "Pending")]
    [InlineData("Running", "Running")]
    [InlineData("Succeeded", "Succeeded")]
    [InlineData("Failed", "Failed")]
    [InlineData("Cancelled", "Cancelled")]
    [InlineData("  succeeded  ", "succeeded")]
    public async Task GetHistoryAsync_StatusFilter_PassesSanitizedStatusToRepository(string rawStatus, string expectedStatus)
    {
        // Arrange
        const int ownerId = 10;
        var query = new DeploymentHistoryQuery { Status = rawStatus };

        _mockRepository
            .Setup(r => r.GetHistoryAsync(ownerId, null, null, null, expectedStatus, 0, 20, false))
            .ReturnsAsync((new List<DeploymentEntity>(), 0));

        // Act
        var response = await _service.GetHistoryAsync(ownerId, query);

        // Assert
        Assert.NotNull(response);
        _mockRepository.Verify(
            r => r.GetHistoryAsync(ownerId, null, null, null, expectedStatus, 0, 20, false),
            Times.Once);
    }

    #endregion

    #region 2. Advanced Mocking & Event Invariant Verifications

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public async Task CreateAsync_ValidEnvironments_DispatchesGitHubWorkflowAndPublishesKafkaEvent(string envName)
    {
        // Arrange
        const int ownerId = 5;
        const int serviceId = 77;
        const int projectId = 12;
        const int createdDeploymentId = 501;

        var request = new CreateDeploymentRequest
        {
            ServiceId = serviceId.ToString(),
            Environment = envName.ToLower(),
            Version = "v2.1.0",
            Branch = "release/2.1",
            CommitSha = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"
        };

        // Stub repository queries
        _mockRepository
            .Setup(r => r.GetServiceAccessAsync(serviceId.ToString()))
            .ReturnsAsync((true, ownerId, false, projectId, serviceId));

        _mockRepository
            .Setup(r => r.GetEnvironmentByNameAsync(projectId, envName.ToLower()))
            .ReturnsAsync((true, true, envName, "https://preview.harbor.internal"));

        _mockRepository
            .Setup(r => r.GetWorkflowFileAsync(serviceId))
            .ReturnsAsync("custom-deploy.yml");

        _mockRepository
            .Setup(r => r.GetRepositoryNameAsync(serviceId))
            .ReturnsAsync("harbor-org/microservice-api");

        _mockRepository
            .Setup(r => r.CreateAsync(It.Is<DeploymentEntity>(d =>
                d.OwnerId == ownerId &&
                d.ServiceId == serviceId &&
                d.Environment == envName.ToLower() &&
                d.Version == "v2.1.0" &&
                d.Status == "Pending")))
            .ReturnsAsync(createdDeploymentId);

        _mockRepository
            .Setup(r => r.UpdateTriggerResultAsync(createdDeploymentId, "Running", null, null))
            .ReturnsAsync(true);

        // Stub Token Resolver
        _mockTokenResolver
            .Setup(t => t.GetInstallationTokenAsync(ownerId))
            .ReturnsAsync("ghs_dummy_installation_token_xyz");

        // Mock GitHub dispatch with strict expectations
        _mockGitHubClient
            .Setup(g => g.GetCiStatusAsync("harbor-org", "microservice-api", request.CommitSha, "ghs_dummy_installation_token_xyz", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CiCheckResult("passing", "All 18 checks passed"));

        _mockGitHubClient
            .Setup(g => g.DispatchAsync(It.Is<WorkflowDispatchRequest>(w =>
                w.Owner == "harbor-org" &&
                w.Repository == "microservice-api" &&
                w.WorkflowFile == "custom-deploy.yml" &&
                w.Ref == "release/2.1" &&
                w.InstallationToken == "ghs_dummy_installation_token_xyz"), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowDispatchResult(true, null, 204));

        _mockGitHubClient
            .Setup(g => g.PollForRunAsync("harbor-org", "microservice-api", "custom-deploy.yml", "ghs_dummy_installation_token_xyz", It.IsAny<DateTime>(), 30, It.IsAny<CancellationToken>()))
            .ReturnsAsync((99999, "https://github.com/harbor-org/microservice-api/actions/runs/99999"));

        _mockRepository
            .Setup(r => r.SetWorkflowRunAsync(createdDeploymentId, 99999, "https://github.com/harbor-org/microservice-api/actions/runs/99999"))
            .Returns(Task.CompletedTask);

        // Mock Kafka producer to verify exact payload contract
        _mockKafkaProducer
            .Setup(k => k.PublishDeploymentEventAsync(It.Is<DeploymentLifecycleEvent>(e =>
                e.DeploymentId == createdDeploymentId &&
                e.ServiceId == serviceId.ToString() &&
                e.Environment == envName.ToLower() &&
                e.Version == "v2.1.0" &&
                e.Status == "Running")))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        // Assert - Business Results
        Assert.True(result.Success);
        Assert.Null(result.Error);
        Assert.Equal(createdDeploymentId, result.DeploymentId);
        Assert.Equal("Running", result.Status);

        // Assert - Behavioral Verifications
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Once);
        _mockGitHubClient.Verify(g => g.DispatchAsync(It.IsAny<WorkflowDispatchRequest>(), It.IsAny<CancellationToken>()), Times.Once);
        _mockKafkaProducer.Verify(k => k.PublishDeploymentEventAsync(It.IsAny<DeploymentLifecycleEvent>()), Times.Once);
    }

    #endregion

    #region 3. Fault Tolerance & Exception Isolation [Negative Testing]

    [Fact]
    public async Task CreateAsync_WhenDatabaseFailsToCreateEntity_KafkaAndGitHubAreNeverCalled()
    {
        // Arrange: Simulate transient Database Crash
        const int ownerId = 9;
        const int serviceId = 88;

        var request = new CreateDeploymentRequest
        {
            ServiceId = serviceId.ToString(),
            Environment = "staging",
            Version = "1.0.0",
            Branch = "main"
        };

        _mockRepository
            .Setup(r => r.GetServiceAccessAsync(serviceId.ToString()))
            .ReturnsAsync((true, ownerId, false, 1, serviceId));

        _mockRepository
            .Setup(r => r.GetEnvironmentByNameAsync(1, "staging"))
            .ReturnsAsync((true, true, "Staging", null));

        _mockRepository
            .Setup(r => r.GetWorkflowFileAsync(serviceId))
            .ReturnsAsync((string?)null);

        _mockRepository
            .Setup(r => r.GetRepositoryNameAsync(serviceId))
            .ReturnsAsync("harbor-org/service-repo");

        _mockRepository
            .Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>()))
            .ThrowsAsync(new InvalidOperationException("Connection pool exhausted / Postgres socket closed"));

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.CreateAsync(request, ownerId, isAdmin: false));

        Assert.Contains("Connection pool exhausted", ex.Message);

        // Invariant: If database record is not created, we MUST NEVER dispatch workflow or publish Kafka events
        _mockGitHubClient.Verify(g => g.DispatchAsync(It.IsAny<WorkflowDispatchRequest>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockKafkaProducer.Verify(k => k.PublishDeploymentEventAsync(It.IsAny<DeploymentLifecycleEvent>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_WhenGitHubDispatchFails_PublishesFailedEventAndUpdatesDatabaseStatus()
    {
        // Arrange: Simulate GitHub upstream 503 outage
        const int ownerId = 3;
        const int serviceId = 22;
        const int deploymentId = 999;

        var request = new CreateDeploymentRequest
        {
            ServiceId = serviceId.ToString(),
            Environment = "production",
            Version = "3.0.1",
            Branch = "main"
        };

        _mockRepository
            .Setup(r => r.GetServiceAccessAsync(serviceId.ToString()))
            .ReturnsAsync((true, ownerId, false, 5, serviceId));

        _mockRepository
            .Setup(r => r.GetEnvironmentByNameAsync(5, "production"))
            .ReturnsAsync((true, true, "Production", null));

        _mockRepository
            .Setup(r => r.GetWorkflowFileAsync(serviceId))
            .ReturnsAsync("deploy.yml");

        _mockRepository
            .Setup(r => r.GetRepositoryNameAsync(serviceId))
            .ReturnsAsync("harbor-org/critical-api");

        _mockRepository
            .Setup(r => r.CreateAsync(It.IsAny<DeploymentEntity>()))
            .ReturnsAsync(deploymentId);

        _mockGitHubClient
            .Setup(g => g.DispatchAsync(It.IsAny<WorkflowDispatchRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowDispatchResult(false, "GitHub Actions HTTP 503 Service Unavailable"));

        _mockKafkaProducer
            .Setup(k => k.PublishDeploymentEventAsync(It.Is<DeploymentLifecycleEvent>(e =>
                e.DeploymentId == deploymentId &&
                e.Status == "Failed" &&
                e.FailureReason == "GitHub Actions HTTP 503 Service Unavailable")))
            .Returns(Task.CompletedTask);

        _mockRepository
            .Setup(r => r.UpdateTriggerResultAsync(deploymentId, "Failed", "GitHub Actions HTTP 503 Service Unavailable", "GitHub Actions HTTP 503 Service Unavailable"))
            .ReturnsAsync(true);

        // Act
        var result = await _service.CreateAsync(request, ownerId, isAdmin: false);

        // Assert
        Assert.True(result.Success);
        Assert.Equal("Failed", result.Status);
        Assert.Equal("GitHub Actions HTTP 503 Service Unavailable", result.Error);

        _mockRepository.Verify(r => r.UpdateTriggerResultAsync(deploymentId, "Failed", It.IsAny<string>(), It.IsAny<string>()), Times.Once);
        _mockKafkaProducer.Verify(k => k.PublishDeploymentEventAsync(It.Is<DeploymentLifecycleEvent>(e => e.Status == "Failed")), Times.Once);
    }

    [Theory]
    [InlineData("999", 7, false, "Service not found.")]
    [InlineData("13", 99, false, "You do not have permission to deploy this service.")]
    public async Task CreateAsync_AuthorizationAndExistenceChecks_RejectWithAppropriateError(
        string requestedServiceId, int callerUserId, bool isAdmin, string expectedErrorMessage)
    {
        // Arrange
        var request = new CreateDeploymentRequest
        {
            ServiceId = requestedServiceId,
            Environment = "production",
            Version = "1.0.0",
            Branch = "main"
        };

        if (requestedServiceId == "999")
        {
            _mockRepository
                .Setup(r => r.GetServiceAccessAsync("999"))
                .ReturnsAsync((false, 0, false, 0, 0));
        }
        else
        {
            // Belongs to user 7, caller is user 99
            _mockRepository
                .Setup(r => r.GetServiceAccessAsync("13"))
                .ReturnsAsync((true, 7, false, 10, 13));
        }

        // Act
        var result = await _service.CreateAsync(request, callerUserId, isAdmin);

        // Assert
        Assert.False(result.Success);
        Assert.Equal(expectedErrorMessage, result.Error);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
        _mockKafkaProducer.Verify(k => k.PublishDeploymentEventAsync(It.IsAny<DeploymentLifecycleEvent>()), Times.Never);
    }

    [Theory]
    [ClassData(typeof(DeploymentSecurityMatrixClassData))]
    public async Task CreateAsync_ClassDataSecurityMatrix_ValidatesAccessControlPolicies(
        string requestedServiceId, int callerUserId, bool isAdmin, string expectedErrorMessage)
    {
        // Arrange
        var request = new CreateDeploymentRequest
        {
            ServiceId = requestedServiceId,
            Environment = "production",
            Version = "1.0.0",
            Branch = "main"
        };

        if (requestedServiceId == "999" || requestedServiceId == "0")
        {
            _mockRepository
                .Setup(r => r.GetServiceAccessAsync(requestedServiceId))
                .ReturnsAsync((false, 0, false, 0, 0));
        }
        else
        {
            _mockRepository
                .Setup(r => r.GetServiceAccessAsync("13"))
                .ReturnsAsync((true, 7, false, 10, 13));
        }

        // Act
        var result = await _service.CreateAsync(request, callerUserId, isAdmin);

        // Assert
        Assert.False(result.Success);
        Assert.Equal(expectedErrorMessage, result.Error);
        _mockRepository.Verify(r => r.CreateAsync(It.IsAny<DeploymentEntity>()), Times.Never);
        _mockKafkaProducer.Verify(k => k.PublishDeploymentEventAsync(It.IsAny<DeploymentLifecycleEvent>()), Times.Never);
    }

    #endregion
}

/// <summary>
/// Strongly-typed ClassData provider demonstrating reusable parameterized test data in xUnit.
/// </summary>
public class DeploymentSecurityMatrixClassData : IEnumerable<object[]>
{
    public IEnumerator<object[]> GetEnumerator()
    {
        yield return new object[] { "999", 7, false, "Service not found." };
        yield return new object[] { "13", 99, false, "You do not have permission to deploy this service." };
        yield return new object[] { "0", 1, false, "Service not found." };
    }

    IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

