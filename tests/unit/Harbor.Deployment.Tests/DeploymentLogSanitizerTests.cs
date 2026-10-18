using Harbor.Deployment.Services;
using Xunit;

namespace Harbor.Deployment.Tests;

/// <summary>
/// Student 2: Targeted Unit Tests to Kill Surviving Mutants in DeploymentLogSanitizer
/// Validates credential scrubbing, authorization header redaction, and regex boundaries.
/// </summary>
public class DeploymentLogSanitizerTests
{
    [Theory]
    [InlineData("Authorization: Bearer my-super-secret-token-12345", "Authorization: Bearer [REDACTED]")]
    [InlineData("authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", "authorization: bearer [REDACTED]")]
    [InlineData("Connecting with AUTHORIZATION:BEARER secret-key-xyz", "Connecting with AUTHORIZATION:BEARER [REDACTED]")]
    public void Sanitize_BearerCredentials_RedactsTokenPayload(string inputLog, string expectedSanitized)
    {
        var result = DeploymentLogSanitizer.Sanitize(inputLog);
        Assert.Equal(expectedSanitized, result);
    }

    [Theory]
    [InlineData("{\"password\": \"UltraSecret123!\"}", "{\"password\": \"[REDACTED]\"}")]
    [InlineData("{\"client_secret\": \"cs_live_998877\"}", "{\"client_secret\": \"[REDACTED]\"}")]
    [InlineData("{\"api_key\": \"key_abcdef123456\"}", "{\"api_key\": \"[REDACTED]\"}")]
    [InlineData("{\"private_key\": \"-----BEGIN PRIVATE KEY-----\"}", "{\"private_key\": \"[REDACTED]\"}")]
    [InlineData("{\"access_key\": \"AKIAIOSFODNN7EXAMPLE\"}", "{\"access_key\": \"[REDACTED]\"}")]
    [InlineData("{\"token\": \"ghp_abcdefghijklmnopqrstuvwxyz012345\"}", "{\"token\": \"[REDACTED]\"}")]
    public void Sanitize_QuotedSensitiveJsonSettings_RedactsSecretValue(string inputLog, string expectedSanitized)
    {
        var result = DeploymentLogSanitizer.Sanitize(inputLog);
        Assert.Equal(expectedSanitized, result);
    }

    [Theory]
    [InlineData("password=MyPassword123!", "password=[REDACTED]")]
    [InlineData("secret: SuperSecretKey", "secret: [REDACTED]")]
    [InlineData("api-key=xyz789", "api-key=[REDACTED]")]
    [InlineData("TOKEN=gho_randomstring", "TOKEN=[REDACTED]")]
    public void Sanitize_UnquotedSensitiveSettings_RedactsSecretValue(string inputLog, string expectedSanitized)
    {
        var result = DeploymentLogSanitizer.Sanitize(inputLog);
        Assert.Equal(expectedSanitized, result);
    }

    [Theory]
    [InlineData(null, "")]
    [InlineData("", "")]
    [InlineData("   ", "   ")]
    [InlineData("Build completed in 1.4s with 0 errors.", "Build completed in 1.4s with 0 errors.")]
    [InlineData("Container deployed to https://my-app.railway.app", "Container deployed to https://my-app.railway.app")]
    public void Sanitize_SafeLogsOrNull_ReturnsExpectedTextWithoutModifications(string? inputLog, string expectedResult)
    {
        var result = DeploymentLogSanitizer.Sanitize(inputLog);
        Assert.Equal(expectedResult, result);
    }
}
