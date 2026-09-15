using Npgsql;

namespace Harbor.Environment.Data;

public class DbConnectionFactory
{
    private readonly string _connectionString;

    public DbConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("HarborDb")
            ?? System.Environment.GetEnvironmentVariable("HarborDb")
            ?? $"Host={System.Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost"};" +
               $"Port={System.Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5433"};" +
               $"Database={System.Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db"};" +
               $"Username={System.Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser"};" +
               $"Password={System.Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234"};";
    }

    public NpgsqlConnection CreateConnection() => new(_connectionString);
}
