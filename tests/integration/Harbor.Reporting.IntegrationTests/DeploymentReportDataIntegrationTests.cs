using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Reporting.DTOs;
using Npgsql;
using Xunit;

namespace Harbor.Reporting.IntegrationTests;

[Collection("DatabaseIntegration")]
public class DeploymentReportDataIntegrationTests : IClassFixture<ReportingApiFactory>, IAsyncLifetime
{
    private readonly ReportingApiFactory _factory;
    private readonly HttpClient _client;

    private const int User1Id = 101;
    private const int User2Id = 102;

    public DeploymentReportDataIntegrationTests(ReportingApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await using var conn = new NpgsqlConnection(ReportingApiFactory.TestConnectionString);
        await conn.OpenAsync();

        // Clean tables
        await using var cleanCmd = new NpgsqlCommand(@"
            TRUNCATE TABLE ""Deployments"", ""Services"", ""Projects"", ""Users"" CASCADE;
        ", conn);
        await cleanCmd.ExecuteNonQueryAsync();

        // Seed Users
        await using var seedUsers = new NpgsqlCommand(@"
            INSERT INTO ""Users"" (""Id"", ""Username"", ""Email"") VALUES
            (101, 'developer1', 'dev1@example.com'),
            (102, 'developer2', 'dev2@example.com');
        ", conn);
        await seedUsers.ExecuteNonQueryAsync();

        // Seed Projects
        await using var seedProjects = new NpgsqlCommand(@"
            INSERT INTO ""Projects"" (""Id"", ""PublicId"", ""Name"", ""OwnerId"") VALUES
            (1, 'prj-alpha-123', 'Project Alpha', 101),
            (2, 'prj-beta-456',  'Project Beta',  102);
        ", conn);
        await seedProjects.ExecuteNonQueryAsync();

        // Seed Services
        await using var seedServices = new NpgsqlCommand(@"
            INSERT INTO ""Services"" (""Id"", ""PublicId"", ""ProjectId"", ""Name"", ""Type"") VALUES
            (10, 'srv-alpha-api', 1, 'Alpha Api', 'Backend'),
            (20, 'srv-beta-api',  2, 'Beta Api',  'Backend');
        ", conn);
        await seedServices.ExecuteNonQueryAsync();

        // Seed Deployments
        // Dep 1: Project 1, Production, Succeeded, Started 2026-03-01 10:00, Completed 10:10 (duration 600s)
        // Dep 2: Project 1, Production, Failed,    Started 2026-03-02 11:00, Completed 11:02 (duration 120s)
        // Dep 3: Project 1, Staging,    Succeeded, Started 2026-03-03 12:00, Completed 12:05 (duration 300s)
        // Dep 4: Project 1, Production, Running,   Started 2026-03-04 13:00, Completed NULL  (duration null)
        // Dep 5: Project 2, Production, Succeeded, Started 2026-03-05 14:00, Completed 14:10 (duration 600s)
        await using var seedDeployments = new NpgsqlCommand(@"
            INSERT INTO ""Deployments""
            (""Id"", ""PublicId"", ""ServiceId"", ""OwnerId"", ""Environment"", ""Version"", ""CommitSha"", ""CommitMessage"", ""Status"", ""StartedAt"", ""CompletedAt"", ""FailureReason"")
            VALUES
            (1001, 'dep-1001', 10, 101, 'Production', '1.0.0', 'sha1', 'feat: init',   'Succeeded', '2026-03-01 10:00:00+00', '2026-03-01 10:10:00+00', NULL),
            (1002, 'dep-1002', 10, 101, 'Production', '1.0.1', 'sha2', 'fix: bug',    'Failed',    '2026-03-02 11:00:00+00', '2026-03-02 11:02:00+00', 'Build timeout'),
            (1003, 'dep-1003', 10, 101, 'Staging',    '1.0.2', 'sha3', 'feat: staging', 'Succeeded', '2026-03-03 12:00:00+00', '2026-03-03 12:05:00+00', NULL),
            (1004, 'dep-1004', 10, 101, 'Production', '1.0.3', 'sha4', 'chore: wip',   'Running',   '2026-03-04 13:00:00+00', NULL,                      NULL),
            (1005, 'dep-1005', 20, 102, 'Production', '2.0.0', 'sha5', 'feat: beta',   'Succeeded', '2026-03-05 14:00:00+00', '2026-03-05 14:10:00+00', NULL);
        ", conn);
        await seedDeployments.ExecuteNonQueryAsync();
    }

    public Task DisposeAsync() => Task.CompletedTask;

    private void AuthenticateClient(int userId, string role = "User")
    {
        var token = TestJwtFactory.CreateToken(userId, role);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task Scenario1_GenerateReport_ReturnsAllAccessibleDeploymentsWithStatistics()
    {
        // User 101 owns Project 1, which has 4 deployments (deps 1001, 1002, 1003, 1004)
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Equal(4, report.Items.Count);
        Assert.Equal(4, report.Statistics.TotalDeployments);
        Assert.Equal(2, report.Statistics.SuccessfulDeployments); // 1001, 1003
        Assert.Equal(1, report.Statistics.FailedDeployments);     // 1002
        Assert.Equal(50.0, report.Statistics.SuccessRate);        // 2/4 = 50.0%
        // Durations: 600, 120, 300 -> avg = 1020 / 3 = 340.0
        Assert.Equal(340.0, report.Statistics.AverageDurationSeconds);
    }

    [Fact]
    public async Task Scenario2_FilterByProject_WhenFilteringByNumericId_ReturnsOnlyProjectDeployments()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?projectId=1");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Equal(4, report.Items.Count);
        Assert.All(report.Items, item => Assert.Equal("Project Alpha", item.ProjectName));
    }

    [Fact]
    public async Task Scenario2_FilterByProject_WhenFilteringByPublicId_DemonstratesDefect()
    {
        // DEFECT IDENTIFIED (Bug #1):
        // XML doc in DeploymentReportDtos.cs states:
        // "Filter by project public-id or integer id string. Omit to include all projects."
        // However, DeploymentReportRepository queries: p."Id"::text = @projectId
        // which tests the integer Id column rather than p."PublicId".
        // When a client passes PublicId "prj-alpha-123", zero rows match.
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?projectId=prj-alpha-123");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);

        // Actual behavior due to Bug #1: returns 0 items instead of 4
        Assert.Empty(report.Items);
    }

    [Fact]
    public async Task Scenario3_FilterByEnvironment_ReturnsOnlyMatchingEnvironment()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?environment=Staging");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Single(report.Items);
        Assert.Equal("Staging", report.Items[0].Environment);
        Assert.Equal(1, report.Statistics.TotalDeployments);
        Assert.Equal(1, report.Statistics.SuccessfulDeployments);
        Assert.Equal(100.0, report.Statistics.SuccessRate);
        Assert.Equal(300.0, report.Statistics.AverageDurationSeconds);
    }

    [Fact]
    public async Task Scenario3_FilterByEnvironment_IsCaseInsensitive()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?environment=production");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Equal(3, report.Items.Count);
        Assert.All(report.Items, item => Assert.Equal("Production", item.Environment));
    }

    [Fact]
    public async Task Scenario4_FilterByStatus_ReturnsOnlyMatchingStatus()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?status=Failed");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Single(report.Items);
        Assert.Equal("Failed", report.Items[0].Status);
        Assert.Equal("Build timeout", report.Items[0].FailureReason);
        Assert.Equal(1, report.Statistics.TotalDeployments);
        Assert.Equal(0, report.Statistics.SuccessfulDeployments);
        Assert.Equal(1, report.Statistics.FailedDeployments);
        Assert.Equal(0.0, report.Statistics.SuccessRate);
        Assert.Equal(120.0, report.Statistics.AverageDurationSeconds);
    }

    [Fact]
    public async Task Scenario5_FilterByDateRange_IncludesDeploymentsWithinDateRange()
    {
        AuthenticateClient(User1Id);

        // Dep 1001 started 2026-03-01, Dep 1002 started 2026-03-02
        var response = await _client.GetAsync("/api/reports/deployments?startDate=2026-03-01&endDate=2026-03-02");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Equal(2, report.Items.Count);
        Assert.Contains(report.Items, i => i.Id == 1001);
        Assert.Contains(report.Items, i => i.Id == 1002);
    }

    [Fact]
    public async Task Scenario6_CalculateDeploymentStatistics_ComputesTotalSuccessfulFailedAndSuccessRate()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?environment=Production");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);

        // 3 production deployments: 1 Succeeded, 1 Failed, 1 Running
        Assert.Equal(3, report.Statistics.TotalDeployments);
        Assert.Equal(1, report.Statistics.SuccessfulDeployments);
        Assert.Equal(1, report.Statistics.FailedDeployments);
        // Success rate: 1 / 3 = 33.3%
        Assert.Equal(33.3, report.Statistics.SuccessRate);
    }

    [Fact]
    public async Task Scenario7_CalculateAverageDuration_ComputesAverageOverCompletedDeploymentsOnly()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?environment=Production");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);

        // Completed production deployments: Dep 1001 (600s) + Dep 1002 (120s) = 720 / 2 = 360s
        // Running dep 1004 has null duration and must not skew average
        Assert.Equal(360.0, report.Statistics.AverageDurationSeconds);
    }

    [Fact]
    public async Task Scenario8_NoMatchingDeployments_ReturnsEmptyResultAndZeroStatistics()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?environment=NonExistent");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Empty(report.Items);
        Assert.Equal(0, report.Statistics.TotalDeployments);
        Assert.Equal(0, report.Statistics.SuccessfulDeployments);
        Assert.Equal(0, report.Statistics.FailedDeployments);
        Assert.Equal(0.0, report.Statistics.SuccessRate);
        Assert.Null(report.Statistics.AverageDurationSeconds);
    }

    [Fact]
    public async Task Scenario_CombinedFilters_ProjectEnvironmentStatus_ReturnsMatchingSubset()
    {
        AuthenticateClient(User1Id);

        var response = await _client.GetAsync("/api/reports/deployments?projectId=1&environment=Production&status=Succeeded");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Single(report.Items);
        Assert.Equal(1001, report.Items[0].Id);
        Assert.Equal(1, report.Statistics.TotalDeployments);
        Assert.Equal(1, report.Statistics.SuccessfulDeployments);
        Assert.Equal(100.0, report.Statistics.SuccessRate);
    }

    [Fact]
    public async Task Scenario_OwnershipIsolation_NonAdminOnlyViewsOwnProjectDeployments()
    {
        // User 102 only owns Project 2 (Beta), which has Dep 1005
        AuthenticateClient(User2Id);

        var response = await _client.GetAsync("/api/reports/deployments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Single(report.Items);
        Assert.Equal(1005, report.Items[0].Id);
        Assert.Equal("Project Beta", report.Items[0].ProjectName);
    }

    [Fact]
    public async Task Scenario_AdminAccess_AdminViewsDeploymentsAcrossAllProjects()
    {
        // Admin views deployments across all projects (Alpha + Beta = 5 total)
        AuthenticateClient(userId: 1, role: "Admin");

        var response = await _client.GetAsync("/api/reports/deployments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Equal(5, report.Items.Count);
        Assert.Equal(5, report.Statistics.TotalDeployments);
        Assert.Equal(3, report.Statistics.SuccessfulDeployments); // 1001, 1003, 1005
        Assert.Equal(1, report.Statistics.FailedDeployments);     // 1002
        Assert.Equal(60.0, report.Statistics.SuccessRate);        // 3/5 = 60.0%
    }
}
