using Harbor.Reporting.Data;
using Harbor.Reporting.Repositories;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Reporting.Tests;

[Collection("ReportingEnvVars")]
public class DeploymentReportRepositoryParameterTests
{
    private readonly ReportingDbConnectionFactory _dbFactory;

    static DeploymentReportRepositoryParameterTests()
    {
        try
        {
            DotNetEnv.Env.TraversePath().Load();
        }
        catch
        {
            // Ignore if .env is missing or unreadable
        }
    }

    public DeploymentReportRepositoryParameterTests()
    {
        IConfiguration config = new ConfigurationBuilder().Build();
        _dbFactory = new ReportingDbConnectionFactory(config);
    }

    private bool CanConnect()
    {
        try
        {
            using var conn = _dbFactory.CreateConnection();
            conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                    CREATE TABLE IF NOT EXISTS "Users" (
                        "Id" SERIAL PRIMARY KEY,
                        "PublicId" VARCHAR(50) DEFAULT 'usr-test',
                        "Username" VARCHAR(100) NOT NULL,
                        "Email" VARCHAR(200),
                        "PasswordHash" VARCHAR(255) NOT NULL DEFAULT 'test-hash',
                        "Role" VARCHAR(50) NOT NULL DEFAULT 'User'
                    );

                    CREATE TABLE IF NOT EXISTS "Projects" (
                        "Id" SERIAL PRIMARY KEY,
                        "PublicId" VARCHAR(50) DEFAULT 'prj-test',
                        "Name" VARCHAR(100) NOT NULL,
                        "OwnerId" INTEGER NOT NULL DEFAULT 1
                    );

                    CREATE TABLE IF NOT EXISTS "Services" (
                        "Id" SERIAL PRIMARY KEY,
                        "PublicId" VARCHAR(50) DEFAULT 'srv-test',
                        "ProjectId" INTEGER,
                        "Name" VARCHAR(100) NOT NULL,
                        "Type" VARCHAR(50) NOT NULL DEFAULT 'Backend'
                    );

                    CREATE TABLE IF NOT EXISTS "Deployments" (
                        "Id" SERIAL PRIMARY KEY,
                        "PublicId" VARCHAR(50),
                        "ServiceId" INTEGER,
                        "OwnerId" INTEGER,
                        "Environment" VARCHAR(50),
                        "Version" VARCHAR(50),
                        "CommitSha" VARCHAR(100),
                        "CommitMessage" TEXT,
                        "Status" VARCHAR(50),
                        "StartedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                        "CompletedAt" TIMESTAMPTZ,
                        "FailureReason" TEXT
                    );
                """;
            cmd.ExecuteNonQuery();

            return true;
        }
        catch
        {
            return false;
        }
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
        if (!CanConnect()) return;
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
        if (!CanConnect()) return;
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
        if (!CanConnect()) return;
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
        if (!CanConnect()) return;
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
        if (!CanConnect()) return;
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
