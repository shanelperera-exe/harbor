using Harbor.Project.Data;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Project.Tests;

[Collection("SequentialDataTests")]
public class DataConfigurationTests
{
    [Fact]
    public void DbConnectionFactory_FromConfiguration_UsesConfigConnectionString()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:HarborDb"] = "Host=projecthost;Port=5432;Database=projdb;Username=projuser;Password=projpass;"
            })
            .Build();

        var factory = new DbConnectionFactory(config);
        using var conn = factory.CreateConnection();
        Assert.Equal("Host=projecthost;Port=5432;Database=projdb;Username=projuser;Password=projpass;", conn.ConnectionString);
    }

    [Fact]
    public void DbConnectionFactory_FromHarborDbEnvVar_UsesEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=env_proj;Port=5432;Database=env_db;Username=env_u;Password=env_p;");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=env_proj;Port=5432;Database=env_db;Username=env_u;Password=env_p;", conn.ConnectionString);
        }
        finally
        {
            Environment.SetEnvironmentVariable("HarborDb", null);
        }
    }

    [Fact]
    public void DbConnectionFactory_FromPostgresEnvVars_ConstructsConnectionString()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", null);
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "db.proj.com");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5434");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "custom_proj_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "custom_proj_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "custom_proj_pass");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=db.proj.com;Port=5434;Database=custom_proj_db;Username=custom_proj_user;Password=custom_proj_pass;", conn.ConnectionString);
        }
        finally
        {
            Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
            Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
            Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
            Environment.SetEnvironmentVariable("POSTGRES_USER", null);
            Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
        }
    }

    [Fact]
    public void DbConnectionFactory_AllNull_UsesDefaultValues()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", null);
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
        Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
        Environment.SetEnvironmentVariable("POSTGRES_USER", null);
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);

        var factory = new DbConnectionFactory(config);
        using var conn = factory.CreateConnection();
        Assert.Equal("Host=localhost;Port=5433;Database=harbor_db;Username=harboruser;Password=harbor@1234;", conn.ConnectionString);
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromConfiguration()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:HarborDb"] = "Host=cfg_proj;Database=cfg_proj;"
            })
            .Build();

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Equal("Host=cfg_proj;Database=cfg_proj;", cs);
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromHarborDbEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=env_proj_init;");
        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Equal("Host=env_proj_init;", cs);
        }
        finally
        {
            Environment.SetEnvironmentVariable("HarborDb", null);
        }
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromPostgresEnvVars()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", null);
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "proj-host");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5432");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "proj_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "proj_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "proj_pw");
        Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", "Prefer");

        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Contains("Host=proj-host", cs);
            Assert.Contains("Port=5432", cs);
            Assert.Contains("Database=proj_db", cs);
            Assert.Contains("Username=proj_user", cs);
            Assert.Contains("Password=proj_pw", cs);
            Assert.Contains("Ssl Mode=Prefer", cs);
        }
        finally
        {
            Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
            Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
            Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
            Environment.SetEnvironmentVariable("POSTGRES_USER", null);
            Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
            Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", null);
        }
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_Defaults()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", null);
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
        Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
        Environment.SetEnvironmentVariable("POSTGRES_USER", null);
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
        Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", null);

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Contains("Host=localhost", cs);
        Assert.Contains("Port=5432", cs);
        Assert.Contains("Database=harbor_db", cs);
        Assert.Contains("Username=harboruser", cs);
        Assert.Contains("Password=harbor@1234", cs);
        Assert.Contains("Ssl Mode=Require", cs);
    }
}
