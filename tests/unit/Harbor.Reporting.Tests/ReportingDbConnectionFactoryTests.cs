using Harbor.Reporting.Data;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Reporting.Tests;

[Collection("ReportingEnvVars")]
public class ReportingDbConnectionFactoryTests : IDisposable
{
    private static readonly string[] Vars =
        { "HarborDb", "POSTGRES_SERVER", "POSTGRES_PORT", "POSTGRES_DATABASE", "POSTGRES_USER", "POSTGRES_PASSWORD" };

    public ReportingDbConnectionFactoryTests() => Clear();
    public void Dispose() => Clear();

    private static void Clear()
    {
        foreach (var v in Vars) Environment.SetEnvironmentVariable(v, null);
    }

    [Fact]
    public void FromConfiguration_UsesConfigConnectionString()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["ConnectionStrings:HarborDb"] = "Host=cfg;Database=d;" }).Build();
        using var conn = new ReportingDbConnectionFactory(config).CreateConnection();
        Assert.Equal("Host=cfg;Database=d;", conn.ConnectionString);
    }

    [Fact]
    public void FromHarborDbEnvVar_UsesEnvVar()
    {
        Environment.SetEnvironmentVariable("HarborDb", "Host=envdb;Database=e;");
        using var conn = new ReportingDbConnectionFactory(new ConfigurationBuilder().Build()).CreateConnection();
        Assert.Equal("Host=envdb;Database=e;", conn.ConnectionString);
    }

    [Fact]
    public void FromPostgresEnvVars_BuildsConnectionString()
    {
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "h");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "1234");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "u");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "p");
        using var conn = new ReportingDbConnectionFactory(new ConfigurationBuilder().Build()).CreateConnection();
        Assert.Equal("Host=h;Port=1234;Database=db;Username=u;Password=p;", conn.ConnectionString);
    }

    [Fact]
    public void NothingConfigured_UsesDefaults()
    {
        using var conn = new ReportingDbConnectionFactory(new ConfigurationBuilder().Build()).CreateConnection();
        Assert.Equal("Host=localhost;Port=5433;Database=harbor_db;Username=harboruser;Password=harbor@1234;", conn.ConnectionString);
    }
}
