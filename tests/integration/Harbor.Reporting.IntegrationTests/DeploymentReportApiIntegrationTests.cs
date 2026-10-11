using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Reporting.DTOs;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Harbor.Reporting.IntegrationTests;

public class DeploymentReportApiIntegrationTests : IClassFixture<ReportingApiFactory>
{
    private readonly ReportingApiFactory _factory;
    private readonly HttpClient _client;

    public DeploymentReportApiIntegrationTests(ReportingApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private void AuthenticateClient(int userId = 42, string role = "User")
    {
        var token = TestJwtFactory.CreateToken(userId, role);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenUnauthenticated_Returns401Unauthorized()
    {
        _client.DefaultRequestHeaders.Authorization = null;

        var response = await _client.GetAsync("/api/reports/deployments");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("/api/reports/deployments")]
    [InlineData("/api/reporting/deployments")]
    public async Task GetDeploymentReport_BothConfiguredRoutes_AreAccessibleAndReturn200(string route)
    {
        AuthenticateClient();

        var response = await _client.GetAsync(route);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenStartDateAfterEndDate_Returns400BadRequestWithProblemDetails()
    {
        AuthenticateClient();

        var response = await _client.GetAsync("/api/reports/deployments?startDate=2026-05-01&endDate=2026-04-01");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>();
        Assert.NotNull(problem);
        Assert.Equal("Invalid date range", problem.Title);
        Assert.Equal("StartDate must be on or before EndDate.", problem.Detail);
        Assert.Equal(400, problem.Status);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenValidQuery_ReturnsDeploymentReportResponseShape()
    {
        AuthenticateClient();

        var response = await _client.GetAsync("/api/reports/deployments?environment=Production&status=Succeeded");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();

        Assert.NotNull(report);
        Assert.NotNull(report.AppliedFilters);
        Assert.Equal("Production", report.AppliedFilters.Environment);
        Assert.Equal("Succeeded", report.AppliedFilters.Status);
        Assert.NotNull(report.Statistics);
        Assert.NotNull(report.Items);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenNoDeploymentsMatch_ReturnsEmptyItemsAndZeroStatistics()
    {
        // AC8: Given no deployments match the selected filters,
        // Harbor shall display an appropriate empty result and shall not display misleading statistics.
        AuthenticateClient();

        var response = await _client.GetAsync("/api/reports/deployments?environment=NonExistentEnv999");

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

    [Theory]
    [InlineData("'; DROP TABLE \"Deployments\"; --")]
    [InlineData("' OR '1'='1")]
    [InlineData("<script>alert(1)</script>")]
    public async Task GetDeploymentReport_WithMaliciousInputInFilters_SafelyHandledWithoutSqlInjection(string maliciousPayload)
    {
        // User Story: The backend should construct the required filtered query using parameterized SQL rather than unsafe string concatenation.
        AuthenticateClient();

        var encoded = Uri.EscapeDataString(maliciousPayload);
        var response = await _client.GetAsync($"/api/reports/deployments?projectId={encoded}&environment={encoded}&status={encoded}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.Empty(report.Items);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenAdminUser_ReturnsOk()
    {
        AuthenticateClient(userId: 1, role: "Admin");

        var response = await _client.GetAsync("/api/reports/deployments");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
    }

    [Fact]
    public async Task GetDeploymentReport_WithDateRange_ParsesDatesCorrectly()
    {
        AuthenticateClient();

        var response = await _client.GetAsync("/api/reports/deployments?startDate=2026-01-01T00:00:00Z&endDate=2026-01-31T23:59:59Z");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<DeploymentReportResponse>();
        Assert.NotNull(report);
        Assert.NotNull(report.AppliedFilters.StartDate);
        Assert.NotNull(report.AppliedFilters.EndDate);
    }
}
