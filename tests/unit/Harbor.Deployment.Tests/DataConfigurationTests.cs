using Harbor.Deployment.Data;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Deployment.Tests;

[Collection("SequentialDataTests")]
public class DataConfigurationTests
{
    [Fact]
    public void DbConnectionFactory_FromConfiguration_UsesConfigConnectionString()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:HarborDb"] = "Host=myhost;Port=5432;Database=mydb;Username=myuser;Password=mypass;"
            })
            .Build();

        var factory = new DbConnectionFactory(config);
        using var conn = factory.CreateConnection();
        Assert.Equal("Host=myhost;Port=5432;Database=mydb;Username=myuser;Password=mypass;", conn.ConnectionString);
    }

    [Fact]
    public void DbConnectionFactory_FromHarborDbEnvVar_UsesEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=envhost;Port=5432;Database=envdb;Username=envuser;Password=envpass;");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=envhost;Port=5432;Database=envdb;Username=envuser;Password=envpass;", conn.ConnectionString);
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
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "db.example.com");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5434");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "custom_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "custom_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "custom_pass");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=db.example.com;Port=5434;Database=custom_db;Username=custom_user;Password=custom_pass;", conn.ConnectionString);
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
                ["ConnectionStrings:HarborDb"] = "Host=cfg;Database=cfg;"
            })
            .Build();

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Equal("Host=cfg;Database=cfg;", cs);
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromHarborDbEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=env_harbor;");
        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Equal("Host=env_harbor;", cs);
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
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "prod-host");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5432");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "prod_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "prod_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "prod_pw");
        Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", "Prefer");

        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Contains("Host=prod-host", cs);
            Assert.Contains("Port=5432", cs);
            Assert.Contains("Database=prod_db", cs);
            Assert.Contains("Username=prod_user", cs);
            Assert.Contains("Password=prod_pw", cs);
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
