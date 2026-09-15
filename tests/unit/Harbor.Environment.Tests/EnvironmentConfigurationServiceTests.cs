using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Repositories;
using Harbor.Environment.Security;
using Harbor.Environment.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Environment.Tests;

public class EnvironmentConfigurationServiceTests
{
    private readonly Mock<IEnvironmentRepository> _environmentRepository = new();
    private readonly Mock<IEnvironmentConfigurationRepository> _configurationRepository = new();
    private readonly Mock<IEnvironmentSecretProtector> _secretProtector = new();
    private readonly Mock<ILogger<EnvironmentConfigurationService>> _logger = new();
    private readonly EnvironmentConfigurationService _service;

    public EnvironmentConfigurationServiceTests()
    {
        _service = new EnvironmentConfigurationService(
            _environmentRepository.Object,
            _configurationRepository.Object,
            _secretProtector.Object,
            _logger.Object);

        // Standard project access: project 1 owned by user 5, not archived
        _environmentRepository.Setup(r => r.GetProjectAccessAsync(1))
            .ReturnsAsync((true, 5, false));

        // Environment exists and is active
        _environmentRepository.Setup(r => r.GetByIdAsync(It.IsAny<int>(), It.IsAny<int>()))
            .ReturnsAsync(new EnvironmentEntity
            {
                Id = 42, ProjectId = 1, Name = "Development",
                Type = "Development", IsActive = true
            });

        // Secret protector wraps values so we can assert encryption happened
        _secretProtector.Setup(p => p.Protect(It.IsAny<string>()))
            .Returns((string v) => $"ENCRYPTED({v})");
    }

    private ConfigureEnvironmentRequest ValidRequest() => new()
    {
        DeploymentUrl = "https://dev.example.com",
        Provider = "aws",
        Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "harbor" }],
        SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "s3cret" }]
    };

    private EnvironmentEntity ActiveEnvironment() => new()
    {
        Id = 42, ProjectId = 1, Name = "Development",
        Type = "Development", IsActive = true
    };

    // -------------------------------------------------------------------------------------
    // Scenario 1 — Configure environment
    // -------------------------------------------------------------------------------------

    [Fact]
    public async Task ConfigureAsync_ValidConfiguration_SavesAndReturnsResponse()
    {
        var request = ValidRequest();
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42))
            .ReturnsAsync([]);

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.True(result.Success);
        Assert.Null(result.Error);
        Assert.NotNull(result.Data);
        Assert.Equal(42, result.Data!.EnvironmentId);
        Assert.Equal("https://dev.example.com", result.Data.DeploymentUrl);
        Assert.Equal("aws", result.Data.Provider);
        Assert.Single(result.Data.Configuration);
        Assert.Equal("app.name", result.Data.Configuration[0].Key);
        Assert.Equal("harbor", result.Data.Configuration[0].Value);

        // Secure values are only returned as key + IsSet, never the value
        Assert.Single(result.Data.SecureValues);
        Assert.Equal("db.password", result.Data.SecureValues[0].Key);
        Assert.True(result.Data.SecureValues[0].IsSet);

        _secretProtector.Verify(p => p.Protect("s3cret"), Times.Once);
        _configurationRepository.Verify(r => r.ReplaceAllAsync(42, It.IsAny<List<EnvironmentConfigurationEntity>>()), Times.Once);
        _environmentRepository.Verify(r => r.UpdateDeploymentInfoAsync(42, 1, "https://dev.example.com", "aws"), Times.Once);
    }

    [Fact]
    public async Task ConfigureAsync_AdminUser_Succeeds()
    {
        var request = ValidRequest();
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42))
            .ReturnsAsync([]);

        var result = await _service.ConfigureAsync(1, 42, request, 999, true);

        Assert.True(result.Success);
    }

    [Fact]
    public async Task ConfigureAsync_OtherUsersProject_ReturnsForbidden()
    {
        var request = ValidRequest();
        var result = await _service.ConfigureAsync(1, 42, request, 6, false);

        Assert.False(result.Success);
        Assert.True(result.Forbidden);
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task ConfigureAsync_NonExistentProject_ReturnsError()
    {
        _environmentRepository.Setup(r => r.GetProjectAccessAsync(999))
            .ReturnsAsync((false, 0, false));

        var request = ValidRequest();
        var result = await _service.ConfigureAsync(999, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.False(result.Forbidden);
        Assert.Equal("Project not found or archived.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_InactiveEnvironment_ReturnsError()
    {
        _environmentRepository.Setup(r => r.GetByIdAsync(42, 1))
            .ReturnsAsync(new EnvironmentEntity
            {
                Id = 42, ProjectId = 1, Name = "Development",
                Type = "Development", IsActive = false
            });

        var request = ValidRequest();
        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Environment not found or inactive.", result.Error);
    }

    // -------------------------------------------------------------------------------------
    // Scenario 2 — Validate required configuration
    // -------------------------------------------------------------------------------------

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ConfigureAsync_MissingDeploymentUrl_ReturnsValidationError(string? url)
    {
        var request = ValidRequest();
        request.DeploymentUrl = url;

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Deployment URL is required.", result.Error);
        _configurationRepository.Verify(r => r.ReplaceAllAsync(It.IsAny<int>(), It.IsAny<List<EnvironmentConfigurationEntity>>()), Times.Never);
    }

    [Theory]
    [InlineData("ftp://evil.com")]
    [InlineData("not-a-url")]
    [InlineData("httpsexample.com")]
    public async Task ConfigureAsync_InvalidDeploymentUrl_ReturnsValidationError(string url)
    {
        var request = ValidRequest();
        request.DeploymentUrl = url;

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Deployment URL must be a valid absolute http(s) URL.", result.Error);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task ConfigureAsync_MissingProvider_ReturnsValidationError(string? provider)
    {
        var request = ValidRequest();
        request.Provider = provider;

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Provider is required.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_ProviderTooLong_ReturnsValidationError()
    {
        var request = ValidRequest();
        request.Provider = new string('x', 51);

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Provider cannot exceed 50 characters.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_ConfigurationItemMissingKey_ReturnsValidationError()
    {
        var request = ValidRequest();
        request.Configuration = [new ConfigurationItemRequest { Key = "  ", Value = "val" }];

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Configuration key is required.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_ConfigurationItemMissingValue_ReturnsValidationError()
    {
        var request = ValidRequest();
        request.Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "" }];

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Configuration 'app.name' requires a value.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_NewSecureValueMissingValue_ReturnsValidationError()
    {
        var request = ValidRequest();
        request.SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "" }];
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42)).ReturnsAsync([]);

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("A value is required for new secure entry 'db.password'.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_DuplicateKeysAcrossConfigAndSecrets_ReturnsValidationError()
    {
        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com",
            Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "shared", Value = "v1" }],
            SecureValues = [new ConfigurationItemRequest { Key = "shared", Value = "s3cret" }]
        };

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("Configuration and secure value keys must be unique.", result.Error);
    }

    [Fact]
    public async Task ConfigureAsync_EmptyListsAreAccepted()
    {
        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com",
            Provider = "aws",
            Configuration = [],
            SecureValues = []
        };
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42)).ReturnsAsync([]);

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.True(result.Success);
        Assert.Empty(result.Data!.Configuration);
        Assert.Empty(result.Data.SecureValues);
    }

    // -------------------------------------------------------------------------------------
    // Scenario 3 — Protect sensitive information
    // -------------------------------------------------------------------------------------

    [Fact]
    public async Task ConfigureAsync_SecureValueIsEncryptedBeforeStorage()
    {
        var request = ValidRequest();
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42)).ReturnsAsync([]);

        List<EnvironmentConfigurationEntity>? capturedItems = null;
        _configurationRepository.Setup(r => r.ReplaceAllAsync(42, It.IsAny<List<EnvironmentConfigurationEntity>>()))
            .Callback<int, List<EnvironmentConfigurationEntity>>((_, items) => capturedItems = items)
            .Returns(Task.CompletedTask);

        await _service.ConfigureAsync(1, 42, request, 5, false);

        var secretItem = capturedItems!.First(i => i.IsSecret);
        Assert.Equal("db.password", secretItem.Key);
        Assert.Equal("ENCRYPTED(s3cret)", secretItem.Value);
        Assert.NotEqual("s3cret", secretItem.Value);
    }

    [Fact]
    public async Task ConfigureAsync_PlaintextValueIsNotEncrypted()
    {
        var request = ValidRequest();
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42)).ReturnsAsync([]);

        List<EnvironmentConfigurationEntity>? capturedItems = null;
        _configurationRepository.Setup(r => r.ReplaceAllAsync(42, It.IsAny<List<EnvironmentConfigurationEntity>>()))
            .Callback<int, List<EnvironmentConfigurationEntity>>((_, items) => capturedItems = items)
            .Returns(Task.CompletedTask);

        await _service.ConfigureAsync(1, 42, request, 5, false);

        var plainItem = capturedItems!.First(i => !i.IsSecret);
        Assert.Equal("harbor", plainItem.Value);
        _secretProtector.Verify(p => p.Protect(It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task ConfigureAsync_ExistingSecretKeptWhenValueOmitted()
    {
        var existingSecret = new EnvironmentConfigurationEntity
        {
            Id = 1, EnvironmentId = 42, Key = "db.password",
            Value = "ENCRYPTED(previous)", IsSecret = true
        };
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42))
            .ReturnsAsync([existingSecret]);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com",
            Provider = "aws",
            Configuration = [],
            SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "" }]
        };

        List<EnvironmentConfigurationEntity>? capturedItems = null;
        _configurationRepository.Setup(r => r.ReplaceAllAsync(42, It.IsAny<List<EnvironmentConfigurationEntity>>()))
            .Callback<int, List<EnvironmentConfigurationEntity>>((_, items) => capturedItems = items)
            .Returns(Task.CompletedTask);

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.True(result.Success);
        var secretItem = capturedItems!.First(i => i.IsSecret);
        Assert.Equal("ENCRYPTED(previous)", secretItem.Value);
        _secretProtector.Verify(p => p.Protect(It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task ConfigureAsync_NewSecretCannotUseExistingKeyWithoutValue()
    {
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42)).ReturnsAsync([]);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com",
            Provider = "aws",
            SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "" }]
        };

        var result = await _service.ConfigureAsync(1, 42, request, 5, false);

        Assert.False(result.Success);
        Assert.Equal("A value is required for new secure entry 'db.password'.", result.Error);
    }

    [Fact]
    public async Task GetAsync_ReturnsNonSecretValuesButOnlyKeyForSecureValues()
    {
        var now = DateTime.UtcNow;
        _configurationRepository.Setup(r => r.GetByEnvironmentIdAsync(42))
            .ReturnsAsync([
                new EnvironmentConfigurationEntity
                {
                    Id = 1, EnvironmentId = 42, Key = "app.name",
                    Value = "harbor", IsSecret = false, CreatedAt = now, UpdatedAt = now
                },
                new EnvironmentConfigurationEntity
                {
                    Id = 2, EnvironmentId = 42, Key = "db.password",
                    Value = "ENCRYPTED(secret)", IsSecret = true, CreatedAt = now, UpdatedAt = now
                }
            ]);

        var result = await _service.GetAsync(1, 42, 5, false);

        Assert.True(result.Success);
        Assert.Single(result.Data!.Configuration);
        Assert.Equal("harbor", result.Data.Configuration[0].Value);
        Assert.Single(result.Data.SecureValues);
        Assert.Equal("db.password", result.Data.SecureValues[0].Key);
        Assert.True(result.Data.SecureValues[0].IsSet);
        Assert.DoesNotContain("ENCRYPTED", result.Data.SecureValues[0].Key);
    }

    [Fact]
    public async Task GetAsync_OtherUsersProject_ReturnsForbidden()
    {
        var result = await _service.GetAsync(1, 42, 6, false);

        Assert.False(result.Success);
        Assert.True(result.Forbidden);
    }
}
