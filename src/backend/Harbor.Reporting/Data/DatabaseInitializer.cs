using System.Reflection;
using DbUp;

namespace Harbor.Reporting.Data;

public static class DatabaseInitializer
{
    public static void Initialize(IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);
        Harbor.Common.Data.PostgresDatabaseHelper.EnsureDatabaseExists(connectionString);
        var upgrader = DeployChanges.To
            .PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
            .LogToConsole()
            .Build();

        var result = upgrader.PerformUpgrade();
        if (!result.Successful)
        {
            throw new InvalidOperationException("Harbor.Reporting database migration failed.", result.Error);
        }
    }

    public static string ResolveConnectionString(IConfiguration configuration)
    {
        var cs = configuration.GetConnectionString("HarborDb");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        cs = Environment.GetEnvironmentVariable("HarborDb");
        if (!string.IsNullOrWhiteSpace(cs)) return cs;

        var host = Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost";
        var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5433";
        var database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_reporting";
        var username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser";
        var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234";

        return $"Host={host};Port={port};Database={database};Username={username};Password={password};";
    }
}
