using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Harbor.Common.Observability;
using Harbor.Deployment.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Npgsql;
using Xunit;

namespace Harbor.Observability.IntegrationTests;

public class ObservabilityTestAppFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string ScrapeToken = "observability-integration-test-scrape-token";

    public async Task InitializeAsync()
    {
        var config = new ConfigurationBuilder().AddEnvironmentVariables().Build();
        var connectionString = DatabaseInitializer.ResolveConnectionString(config);

        try
        {
            await using var connection = new NpgsqlConnection(connectionString);
            await connection.OpenAsync();

            await using var setup = new NpgsqlCommand("""
                CREATE TABLE IF NOT EXISTS "Projects" (
                    "Id"         SERIAL  PRIMARY KEY,
                    "PublicId"   VARCHAR(50),
                    "Name"       VARCHAR(100) NOT NULL,
                    "OwnerId"    INTEGER NOT NULL DEFAULT 1,
                    "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE,
                    "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
                );

                CREATE TABLE IF NOT EXISTS "Services" (
                    "Id"             SERIAL  PRIMARY KEY,
                    "PublicId"       VARCHAR(50),
                    "ProjectId"      INTEGER REFERENCES "Projects"("Id"),
                    "Name"           VARCHAR(100) NOT NULL,
                    "Type"           VARCHAR(50) NOT NULL DEFAULT 'Backend',
                    "RepositoryName" VARCHAR(500),
                    "RepositoryBranch" VARCHAR(200),
                    "WorkflowFile"   VARCHAR(200)
                );
            """, connection);

            await setup.ExecuteNonQueryAsync();
        }
        catch
        {
            // If postgres is not directly reachable at initialization time,
            // let Program.cs proceed normally.
        }
    }

    public new Task DisposeAsync() => Task.CompletedTask;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = "observability-integration-test-secret-at-least-32-chars",
                ["JWT_ISSUER"] = "harbor",
                ["JWT_AUDIENCE"] = "harbor-api",
                ["DisableHttpsRedirection"] = "true",
                ["KAFKA_BOOTSTRAP_SERVERS"] = "localhost:9092",
                ["KAFKA_DEPLOYMENT_TOPIC"] = "deployment-events",
                ["METRICS_SCRAPE_TOKEN"] = ScrapeToken
            });
        });
    }
}

public class ObservabilityIntegrationTests : IClassFixture<ObservabilityTestAppFactory>
{
    private readonly HttpClient _client;
    private readonly HttpClient _anonymousClient;

    public ObservabilityIntegrationTests(ObservabilityTestAppFactory factory)
    {
        _client = factory.CreateClient();
        _client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", ObservabilityTestAppFactory.ScrapeToken);
        _anonymousClient = factory.CreateClient();
    }

    [Fact]
    public async Task Metrics_WithoutScrapeToken_Returns404()
    {
        var response = await _anonymousClient.GetAsync("/metrics");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Metrics_WithInvalidScrapeToken_Returns404()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/metrics");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "wrong-token");
        var response = await _anonymousClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Scenario1_ServiceHealth_LivenessEndpoint_ReturnsHealthy200()
    {
        // When the service health liveness endpoint is checked
        var response = await _client.GetAsync("/health/live");

        // Then the service health information shall be available with 200 OK
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var status = doc.RootElement.GetProperty("status").GetString();
        Assert.Equal("Healthy", status);
    }

    [Fact]
    public async Task Scenario1_ServiceHealth_AggregatedEndpoint_ReturnsStructuredJson()
    {
        // When the aggregated /health endpoint is checked
        var response = await _client.GetAsync("/health");

        // Then structured health entries shall be available
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.True(root.TryGetProperty("status", out _));
        Assert.True(root.TryGetProperty("totalDuration", out _));
        Assert.True(root.TryGetProperty("entries", out var entries));
        Assert.True(entries.TryGetProperty("self", out var selfEntry));
        Assert.Equal("Healthy", selfEntry.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Scenario2_MetricsCollection_MetricsEndpoint_ReturnsPrometheusExpositionFormat()
    {
        // Given a deployment operation has occurred
        Harbor.Deployment.Observability.HarborDeploymentMetrics.DeploymentsTotal
            .WithLabels("production", "Succeeded")
            .Inc();

        // When Prometheus scrapes the /metrics endpoint
        var response = await _client.GetAsync("/metrics");

        // Then Prometheus metrics format shall be returned
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();

        Assert.NotEmpty(content);
        Assert.Contains("harbor_deployment_operations_total", content);
        Assert.Contains("process_cpu_seconds_total", content);
    }

    [Fact]
    public async Task Scenario3_ErrorTroubleshooting_CorrelationId_PropagatesInResponseHeaders()
    {
        // Given an incoming request with a correlation ID
        var customCorrelationId = "test-corr-" + Guid.NewGuid();
        var request = new HttpRequestMessage(HttpMethod.Get, "/health/live");
        request.Headers.Add(CorrelationIdMiddleware.CorrelationIdHeader, customCorrelationId);

        // When processed
        var response = await _client.SendAsync(request);

        // Then the same correlation ID shall be returned in the response header for troubleshooting
        Assert.True(response.Headers.Contains(CorrelationIdMiddleware.CorrelationIdHeader));
        var returnedId = string.Join(",", response.Headers.GetValues(CorrelationIdMiddleware.CorrelationIdHeader));
        Assert.Equal(customCorrelationId, returnedId);
    }

    [Fact]
    public async Task Scenario3_ErrorTroubleshooting_CorrelationId_GeneratedWhenMissing()
    {
        // Given an incoming request without correlation ID
        var response = await _client.GetAsync("/health/live");

        // Then a unique correlation ID shall be generated and returned in headers
        Assert.True(response.Headers.Contains(CorrelationIdMiddleware.CorrelationIdHeader));
        var returnedId = string.Join(",", response.Headers.GetValues(CorrelationIdMiddleware.CorrelationIdHeader));
        Assert.True(Guid.TryParse(returnedId, out _));
    }

    [Fact]
    public async Task Scenario4_SensitiveInformationProtection_NoSecretsLeakedInHealthOrMetrics()
    {
        // When checking health and metrics endpoints
        var healthResponse = await _client.GetAsync("/health");
        var healthContent = await healthResponse.Content.ReadAsStringAsync();

        var metricsResponse = await _client.GetAsync("/metrics");
        var metricsContent = await metricsResponse.Content.ReadAsStringAsync();

        // Then passwords, secrets and tokens shall not be written
        Assert.DoesNotContain("observability-integration-test-secret", healthContent);
        Assert.DoesNotContain("Password", healthContent);
        Assert.DoesNotContain("observability-integration-test-secret", metricsContent);
    }
}
