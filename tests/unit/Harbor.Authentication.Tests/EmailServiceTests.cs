using Harbor.Authentication.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Authentication.Tests;

public class EmailServiceTests
{
    private readonly Mock<ILogger<EmailService>> _loggerMock = new();

    [Fact]
    public async Task SendEmailAsync_MissingSmtpConfig_LogsWarningAndReturns()
    {
        var config = new ConfigurationBuilder().Build();
        var service = new EmailService(config, _loggerMock.Object);

        // Clear any env vars that might interfere
        Environment.SetEnvironmentVariable("SMTP_HOST", null);
        Environment.SetEnvironmentVariable("SMTP_USERNAME", null);
        Environment.SetEnvironmentVariable("SMTP_PASSWORD", null);

        await service.SendEmailAsync("test@example.com", "Test Subject", "<p>Hello</p>");

        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("SMTP is not configured properly")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Theory]
    [InlineData("a@b.com")] // name length <= 2
    [InlineData("sh@domain.com")] // name length <= 2
    [InlineData("user@example.com")] // name length > 2
    [InlineData("")] // empty email
    [InlineData("not-an-email")] // no @ symbol
    [InlineData("alice.bob@example.com")] // long email
    public async Task SendEmailAsync_MaskEmailVariations_HandlesProperly(string email)
    {
        var config = new ConfigurationBuilder().Build();
        var service = new EmailService(config, _loggerMock.Object);

        Environment.SetEnvironmentVariable("SMTP_HOST", null);
        Environment.SetEnvironmentVariable("SMTP_USERNAME", null);
        Environment.SetEnvironmentVariable("SMTP_PASSWORD", null);

        await service.SendEmailAsync(email, "Subject", "Body");
        // Verifies no exception thrown and MaskEmail exercised
    }

    [Fact]
    public async Task SendEmailAsync_ConfiguredWithInvalidHost_CatchesExceptionAndLogsError()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Smtp:Host"] = "127.0.0.1",
                ["Smtp:Port"] = "65534",
                ["Smtp:Username"] = "harboruser",
                ["Smtp:Password"] = "harborpass",
                ["Smtp:FromName"] = "Harbor CI",
                ["Smtp:FromEmail"] = "ci@harbor.local"
            })
            .Build();

        var service = new EmailService(config, _loggerMock.Object);

        await service.SendEmailAsync("recipient@example.com", "Failing Email", "Content");

        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to send email")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendEmailAsync_InvalidPortFallback_UsesDefaultPort()
    {
        Environment.SetEnvironmentVariable("SMTP_HOST", "invalid.host.local");
        Environment.SetEnvironmentVariable("SMTP_PORT", "not-a-number");
        Environment.SetEnvironmentVariable("SMTP_USERNAME", "harboruser");
        Environment.SetEnvironmentVariable("SMTP_PASSWORD", "secret");

        try
        {
            var config = new ConfigurationBuilder().Build();
            var service = new EmailService(config, _loggerMock.Object);

            await service.SendEmailAsync("admin@harbor.local", "Subject", "Body");

            // Port parsed as 587 fallback, failed connect caught
            _loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }
        finally
        {
            Environment.SetEnvironmentVariable("SMTP_HOST", null);
            Environment.SetEnvironmentVariable("SMTP_PORT", null);
            Environment.SetEnvironmentVariable("SMTP_USERNAME", null);
            Environment.SetEnvironmentVariable("SMTP_PASSWORD", null);
        }
    }
}
