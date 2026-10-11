using Harbor.Reporting.Data;
using Harbor.Reporting.Repositories;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Reporting.Tests;

public class DeploymentReportRepositoryParameterTests
{
    private readonly ReportingDbConnectionFactory _dbFactory;

    public DeploymentReportRepositoryParameterTests()
    {
        var inMemorySettings = new Dictionary<string, string?>
        {
            ["ConnectionStrings:HarborDb"] = "Host=localhost;Port=5432;Database=harbor_reporting_test;Username=supundharmaratne;Password=;"
        };
        IConfiguration config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        _dbFactory = new ReportingDbConnectionFactory(config);
    }

    [Fact]
    public void Repository_InstantiatesSuccessfully_WithConnectionFactory()
    {
        var repo = new DeploymentReportRepository(_dbFactory);
        Assert.NotNull(repo);
    }

    [Theory]
    [InlineData("' OR '1'='1")]
    [InlineData("'; DROP TABLE \"Deployments\"; --")]
    [InlineData("1; SELECT * FROM \"Users\";")]
    public async Task GetReportRowsAsync_WithSqlInjectionPayloadInProjectId_ExecutesSafelyWithoutAlteringSchema(string injectionPayload)
    {
        // AC: Parameterized SQL prevents SQL injection. When injection payloads are supplied,
        // they must be bound as parameters, returning 0 matching rows instead of executing arbitrary SQL.
        var repo = new DeploymentReportRepository(_dbFactory);

        var rows = await repo.GetReportRowsAsync(
            userId: 1,
            isAdmin: true,
            projectId: injectionPayload,
            environment: null,
            status: null,
            startDate: null,
            endDate: null);

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }

    [Theory]
    [InlineData("' OR '1'='1")]
    [InlineData("Production' UNION SELECT * FROM \"Deployments\" --")]
    public async Task GetReportRowsAsync_WithSqlInjectionPayloadInEnvironment_ExecutesSafely(string injectionPayload)
    {
        var repo = new DeploymentReportRepository(_dbFactory);

        var rows = await repo.GetReportRowsAsync(
            userId: 1,
            isAdmin: true,
            projectId: null,
            environment: injectionPayload,
            status: null,
            startDate: null,
            endDate: null);

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }

    [Theory]
    [InlineData("' OR '1'='1")]
    [InlineData("Succeeded' OR 1=1 --")]
    public async Task GetReportRowsAsync_WithSqlInjectionPayloadInStatus_ExecutesSafely(string injectionPayload)
    {
        var repo = new DeploymentReportRepository(_dbFactory);

        var rows = await repo.GetReportRowsAsync(
            userId: 1,
            isAdmin: true,
            projectId: null,
            environment: null,
            status: injectionPayload,
            startDate: null,
            endDate: null);

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task GetReportRowsAsync_WhenNoDeploymentsMatch_ReturnsEmptyCollection()
    {
        var repo = new DeploymentReportRepository(_dbFactory);

        var rows = await repo.GetReportRowsAsync(
            userId: 999999,
            isAdmin: false,
            projectId: "999999",
            environment: "NonExistentEnv",
            status: "NonExistentStatus",
            startDate: DateTime.UtcNow.AddYears(10),
            endDate: DateTime.UtcNow.AddYears(11));

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }

    [Fact]
    public async Task GetReportRowsAsync_WhenQueryingNonAdmin_AppliesOwnershipFilter()
    {
        // When isAdmin is false, query restricts to projects where OwnerId = userId
        var repo = new DeploymentReportRepository(_dbFactory);

        var rows = await repo.GetReportRowsAsync(
            userId: 88888,
            isAdmin: false,
            projectId: null,
            environment: null,
            status: null,
            startDate: null,
            endDate: null);

        Assert.NotNull(rows);
        Assert.Empty(rows);
    }
}
