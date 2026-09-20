using Microsoft.Extensions.Configuration;

namespace Harbor.Project.Data;

public static class DatabaseInitializer
{
    public static void Initialize(IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);
        MigrationRunner.Run(connectionString);
    }

    private static string ResolveConnectionString(IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("HarborDb");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        cs = Environment.GetEnvironmentVariable("HarborDb");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        var host     = Environment.GetEnvironmentVariable("POSTGRES_SERVER")   ?? "localhost";
        var port     = Environment.GetEnvironmentVariable("POSTGRES_PORT")      ?? "5432";
        var database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE")  ?? "harbor_db";
        var username = Environment.GetEnvironmentVariable("POSTGRES_USER")      ?? "harboruser";
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")  ?? "harbor@1234";
        var sslMode  = Environment.GetEnvironmentVariable("POSTGRES_SSL_MODE")  ?? "Require";

        return $"Host={host};Port={port};Database={database};Username={username};Password={password};Ssl Mode={sslMode};Trust Server Certificate=true;";
    }
}