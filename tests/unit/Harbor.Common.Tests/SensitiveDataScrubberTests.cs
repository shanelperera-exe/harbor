using Harbor.Common.Observability;
using Xunit;

namespace Harbor.Common.Tests;

public class SensitiveDataScrubberTests
{
    [Fact]
    public void Scrub_WhenNullOrEmpty_ReturnsEmptyString()
    {
        Assert.Equal(string.Empty, HarborSensitiveDataScrubber.Scrub(null));
        Assert.Equal(string.Empty, HarborSensitiveDataScrubber.Scrub(string.Empty));
    }

    [Fact]
    public void Scrub_WhenPlainText_PreservesNonSensitiveText()
    {
        var input = "Service Harbor.Deployment started successfully on port 8080.";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(input);
        Assert.Equal(input, scrubbed);
    }

    [Theory]
    [InlineData("Connecting with password=SecretPassword123! to database", "Connecting with password=[REDACTED] to database")]
    [InlineData("Auth failure for pwd=SuperSecret;", "Auth failure for pwd=[REDACTED];")]
    [InlineData("Using client_secret='my-client-secret-value'", "Using client_secret='[REDACTED]'")]
    [InlineData("Token refresh with access_token=\"xyz123token\"", "Token refresh with access_token=\"[REDACTED]\"")]
    public void Scrub_RedactsPasswordAndTokenKeyValues(string input, string expected)
    {
        var scrubbed = HarborSensitiveDataScrubber.Scrub(input);
        Assert.Equal(expected, scrubbed);
    }

    [Fact]
    public void Scrub_RedactsJsonSensitiveProperties()
    {
        var json = "{\"username\": \"admin\", \"password\": \"P@ssw0rd!123\", \"apiKey\": \"key-999-xyz\"}";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(json);

        Assert.DoesNotContain("P@ssw0rd!123", scrubbed);
        Assert.DoesNotContain("key-999-xyz", scrubbed);
        Assert.Contains("\"password\": \"[REDACTED]\"", scrubbed);
        Assert.Contains("\"apiKey\": \"[REDACTED]\"", scrubbed);
        Assert.Contains("\"username\": \"admin\"", scrubbed);
    }

    [Fact]
    public void Scrub_RedactsBearerJwtTokens()
    {
        var header = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_placeholder_signature";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(header);

        Assert.DoesNotContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", scrubbed);
        Assert.Contains("Bearer [REDACTED]", scrubbed);
    }

    [Fact]
    public void Scrub_RedactsGitHubPersonalAccessTokens()
    {
        var input = "Cloning repository using token ghp_abcdefghijklmnopqrstuvwxyz0123456789 from GitHub.";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(input);

        Assert.DoesNotContain("ghp_abcdefghijklmnopqrstuvwxyz0123456789", scrubbed);
        Assert.Contains("[REDACTED]", scrubbed);
    }

    [Fact]
    public void Scrub_RedactsDatabaseConnectionStringCredentials()
    {
        var connStr = "Server=postgres-db;Database=harbor;User Id=harbor_admin;Password=UltraSecureDatabasePassword!;Port=5432;";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(connStr);

        Assert.DoesNotContain("UltraSecureDatabasePassword!", scrubbed);
        Assert.DoesNotContain("harbor_admin", scrubbed);
        Assert.Contains("Password=[REDACTED]", scrubbed);
        Assert.Contains("User Id=[REDACTED]", scrubbed);
        Assert.Contains("Server=postgres-db", scrubbed);
    }

    [Fact]
    public void Scrub_RedactsEnvironmentSecretsKey()
    {
        var log = "Loading encryption keys with ENVIRONMENT_SECRETS_KEY=c29tZS0zMi1ieXRlLWJhc2U2NC1zZWNyZXQta2V5LTEyMzQ= for AES-256";
        var scrubbed = HarborSensitiveDataScrubber.Scrub(log);

        Assert.DoesNotContain("c29tZS0zMi1ieXRlLWJhc2U2NC1zZWNyZXQta2V5LTEyMzQ=", scrubbed);
        Assert.Contains("ENVIRONMENT_SECRETS_KEY=[REDACTED]", scrubbed);
    }
}
