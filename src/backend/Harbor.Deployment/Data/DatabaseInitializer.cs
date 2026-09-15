using System.Reflection;
using DbUp;

namespace Harbor.Deployment.Data;

public static class DatabaseInitializer
{
    public static void Initialize(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("HarborDb");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            connectionString = Environment.GetEnvironmentVariable("HarborDb");
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            var host = Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost";
            var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
            var database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db";
            var username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser";
            var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234";

            connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};";
        }

        var result = DeployChanges.To.PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly()).LogToConsole().Build().PerformUpgrade();
        if (!result.Successful) throw new InvalidOperationException("Deployment database migration failed.", result.Error);
    }
}
