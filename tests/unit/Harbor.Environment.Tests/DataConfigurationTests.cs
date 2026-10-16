using Harbor.Environment.Data;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Environment.Tests;

[Collection("SequentialDataTests")]
public class DataConfigurationTests
{
    [Fact]
    public void DbConnectionFactory_FromConfiguration_UsesConfigConnectionString()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:HarborDb"] = "Host=envhost;Port=5432;Database=envdb;Username=envuser;Password=envpass;"
            })
            .Build();

        var factory = new DbConnectionFactory(config);
        using var conn = factory.CreateConnection();
        Assert.Equal("Host=envhost;Port=5432;Database=envdb;Username=envuser;Password=envpass;", conn.ConnectionString);
    }

    [Fact]
    public void DbConnectionFactory_FromHarborDbEnvVar_UsesEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", "Host=env_env;Port=5432;Database=env_db;Username=env_u;Password=env_p;");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=env_env;Port=5432;Database=env_db;Username=env_u;Password=env_p;", conn.ConnectionString);
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("HarborDb", null);
        }
    }

    [Fact]
    public void DbConnectionFactory_FromPostgresEnvVars_ConstructsConnectionString()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", "db.env.com");
        System.Environment.SetEnvironmentVariable("POSTGRES_PORT", "5434");
        System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "custom_env_db");
        System.Environment.SetEnvironmentVariable("POSTGRES_USER", "custom_env_user");
        System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "custom_env_pass");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=db.env.com;Port=5434;Database=custom_env_db;Username=custom_env_user;Password=custom_env_pass;", conn.ConnectionString);
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_USER", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
        }
    }

    [Fact]
    public void DbConnectionFactory_AllNull_UsesDefaultValues()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_USER", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);

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
                ["ConnectionStrings:HarborDb"] = "Host=cfg_env;Database=cfg_env;"
            })
            .Build();

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Equal("Host=cfg_env;Database=cfg_env;", cs);
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromHarborDbEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", "Host=env_env_init;");
        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Equal("Host=env_env_init;", cs);
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("HarborDb", null);
        }
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromPostgresEnvVars()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", "env-host");
        System.Environment.SetEnvironmentVariable("POSTGRES_PORT", "5432");
        System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "env_db");
        System.Environment.SetEnvironmentVariable("POSTGRES_USER", "env_user");
        System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "env_pw");
        System.Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", "Prefer");

        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Contains("Host=env-host", cs);
            Assert.Contains("Port=5432", cs);
            Assert.Contains("Database=env_db", cs);
            Assert.Contains("Username=env_user", cs);
            Assert.Contains("Password=env_pw", cs);
            Assert.Contains("Ssl Mode=Prefer", cs);
        }
        finally
        {
            System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_USER", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
            System.Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", null);
        }
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_Defaults()
    {
        var config = new ConfigurationBuilder().Build();
        System.Environment.SetEnvironmentVariable("HarborDb", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_SERVER", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_PORT", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_DATABASE", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_USER", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", null);
        System.Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", null);

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Contains("Host=localhost", cs);
        Assert.Contains("Port=5432", cs);
        Assert.Contains("Database=harbor_db", cs);
        Assert.Contains("Username=harboruser", cs);
        Assert.Contains("Password=harbor@1234", cs);
        Assert.Contains("Ssl Mode=Require", cs);
    }
}
