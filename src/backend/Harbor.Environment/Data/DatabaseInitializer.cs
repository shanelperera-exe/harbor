using System.Reflection;
using DbUp;

namespace Harbor.Environment.Data;

public static class DatabaseInitializer
{
    public static void Initialize(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("HarborDb")
            ?? System.Environment.GetEnvironmentVariable("HarborDb")
            ?? $"Host={System.Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost"};" +
               $"Port={System.Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432"};" +
               $"Database={System.Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db"};" +
               $"Username={System.Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser"};" +
               $"Password={System.Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234"};Ssl Mode=Require;Trust Server Certificate=true;";
        var result = DeployChanges.To.PostgresqlDatabase(connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly()).Build().PerformUpgrade();
        if (!result.Successful) throw new InvalidOperationException("Environment database migration failed.", result.Error);
    }
}
