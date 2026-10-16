using Harbor.Authentication.Data;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Authentication.Tests;

[Collection("SequentialDataTests")]
public class DataConfigurationTests
{
    [Fact]
    public void DbConnectionFactory_FromConfiguration_UsesConfigConnectionString()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:HarborDb"] = "Host=authhost;Port=5432;Database=authdb;Username=authuser;Password=authpass;"
            })
            .Build();

        var factory = new DbConnectionFactory(config);
        using var conn = factory.CreateConnection();
        Assert.Equal("Host=authhost;Port=5432;Database=authdb;Username=authuser;Password=authpass;", conn.ConnectionString);
    }

    [Fact]
    public void DbConnectionFactory_FromHarborDbEnvVar_UsesEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=env_auth;Port=5432;Database=env_db;Username=env_u;Password=env_p;");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=env_auth;Port=5432;Database=env_db;Username=env_u;Password=env_p;", conn.ConnectionString);
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
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "db.auth.com");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5434");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "custom_auth_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "custom_auth_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "custom_auth_pass");

        try
        {
            var factory = new DbConnectionFactory(config);
            using var conn = factory.CreateConnection();
            Assert.Equal("Host=db.auth.com;Port=5434;Database=custom_auth_db;Username=custom_auth_user;Password=custom_auth_pass;", conn.ConnectionString);
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
                ["ConnectionStrings:HarborDb"] = "Host=cfg_auth;Database=cfg_auth;"
            })
            .Build();

        var cs = DatabaseInitializer.ResolveConnectionString(config);
        Assert.Equal("Host=cfg_auth;Database=cfg_auth;", cs);
    }

    [Fact]
    public void DatabaseInitializer_ResolveConnectionString_FromHarborDbEnvVar()
    {
        var config = new ConfigurationBuilder().Build();
        Environment.SetEnvironmentVariable("HarborDb", "Host=env_auth_init;");
        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Equal("Host=env_auth_init;", cs);
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
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "auth-host");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5432");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "auth_db");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "auth_user");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "auth_pw");
        Environment.SetEnvironmentVariable("POSTGRES_SSL_MODE", "Prefer");

        try
        {
            var cs = DatabaseInitializer.ResolveConnectionString(config);
            Assert.Contains("Host=auth-host", cs);
            Assert.Contains("Port=5432", cs);
            Assert.Contains("Database=auth_db", cs);
            Assert.Contains("Username=auth_user", cs);
            Assert.Contains("Password=auth_pw", cs);
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
