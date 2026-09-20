using Microsoft.Extensions.Configuration;

namespace Harbor.Environment.Data;

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

        cs = System.Environment.GetEnvironmentVariable("HarborDb");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        var host     = System.Environment.GetEnvironmentVariable("POSTGRES_SERVER")   ?? "localhost";
        var port     = System.Environment.GetEnvironmentVariable("POSTGRES_PORT")      ?? "5432";
        var database = System.Environment.GetEnvironmentVariable("POSTGRES_DATABASE")  ?? "harbor_db";
        var username = System.Environment.GetEnvironmentVariable("POSTGRES_USER")      ?? "harboruser";
        var password = System.Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")  ?? "harbor@1234";
        var sslMode  = System.Environment.GetEnvironmentVariable("POSTGRES_SSL_MODE")  ?? "Require";

        return $"Host={host};Port={port};Database={database};Username={username};Password={password};Ssl Mode={sslMode};Trust Server Certificate=true;";
    }
}
