using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Reporting.DTOs;
using Npgsql;
using Xunit;

namespace Harbor.Reporting.IntegrationTests;

[Collection("DatabaseIntegration")]
public class AuditLogsApiIntegrationTests : IClassFixture<ReportingApiFactory>, IAsyncLifetime
{
    private readonly ReportingApiFactory _factory;
    private readonly HttpClient _client;

    public AuditLogsApiIntegrationTests(ReportingApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        try
        {
            await using var conn = new NpgsqlConnection(ReportingApiFactory.TestConnectionString);
            await conn.OpenAsync();

            await using var cleanCmd = new NpgsqlCommand(@"
                TRUNCATE TABLE ""AuditLogs"" CASCADE;
                INSERT INTO ""AuditLogs"" (""Timestamp"", ""Actor"", ""Action"", ""Target"", ""IpAddress"", ""Severity"", ""Details"") VALUES
                (now(), 'admin', 'Login', 'User:1', '127.0.0.1', 'Info', 'Successful admin login'),
                (now(), 'admin', 'Deploy', 'Service:10', '127.0.0.1', 'Warning', NULL);
            ", conn);
            await cleanCmd.ExecuteNonQueryAsync();
        }
        catch
        {
            // If postgres not reachable in this container run, tests will gracefully handle
        }
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task GetAuditLogs_Unauthenticated_Returns401()
    {
        _client.DefaultRequestHeaders.Authorization = null;
        var response = await _client.GetAsync("/api/reporting/audit");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_NonAdmin_Returns403Forbidden()
    {
        var token = TestJwtFactory.CreateToken(101, role: "User");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/reporting/audit");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetAuditLogs_Admin_Returns200WithLogs()
    {
        var token = TestJwtFactory.CreateToken(1, role: "Admin");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await _client.GetAsync("/api/reporting/audit?limit=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var logs = await response.Content.ReadFromJsonAsync<List<AuditLogDto>>();
        Assert.NotNull(logs);
        Assert.NotEmpty(logs);
        Assert.Contains(logs, l => l.Actor == "admin");
    }
}
