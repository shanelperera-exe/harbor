using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Testcontainers.PostgreSql;

namespace Harbor.Project.IntegrationTests
{
    /// <summary>
    /// Boots the real Harbor.Project API (Program.cs) against a throwaway Postgres
    /// container, so tests exercise Controller -> Service -> Repository -> real DB
    /// end-to-end, the same path a real request takes in production.
    /// </summary>
    public class ProjectApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
    {
        // Test-only signing values. Tests use these to mint tokens; the app is
        // configured (below) to validate tokens using these same values.
        public const string JwtSecret = "integration-test-signing-key-please-32chars+";
        public const string JwtIssuer = "harbor-auth-test";
        public const string JwtAudience = "harbor-web-test";

        private readonly PostgreSqlContainer _dbContainer = new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("harbor_test")
            .WithUsername("harbor_test")
            .WithPassword("harbor_test")
            .Build();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // Program.cs reads JWT settings from environment variables, so we set
            // matching test values before the host is built.
            Environment.SetEnvironmentVariable("JWT_SECRET", JwtSecret);
            Environment.SetEnvironmentVariable("JWT_ISSUER", JwtIssuer);
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", JwtAudience);

            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    // Point the app's real DbConnectionFactory/DatabaseInitializer
                    // at the Testcontainers Postgres instance instead of the dev DB.
                    ["ConnectionStrings:HarborDb"] = _dbContainer.GetConnectionString(),
                    ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
                });
            });
        }

        public async Task InitializeAsync()
        {
            // Starts the Postgres container. DbUp migrations then run automatically
            // inside Program.cs (DatabaseInitializer.Initialize) the first time the
            // host is built, using the connection string set above.
            await _dbContainer.StartAsync();
        }

        public new async Task DisposeAsync()
        {
            await _dbContainer.DisposeAsync();
        }
    }
}
