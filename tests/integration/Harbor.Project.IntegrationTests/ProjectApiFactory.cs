using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
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
            builder.UseEnvironment("Testing");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    // Keep authentication settings local to this host. Mutating
                    // process-wide environment variables makes JWT validation
                    // nondeterministic when other test projects run in parallel.
                    ["JWT_SECRET"] = JwtSecret,
                    ["JWT_ISSUER"] = JwtIssuer,
                    ["JWT_AUDIENCE"] = JwtAudience,
                    // Point the app's real DbConnectionFactory/DatabaseInitializer
                    // at the Testcontainers Postgres instance instead of the dev DB.
                    ["ConnectionStrings:HarborDb"] = _dbContainer.GetConnectionString(),
                    ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
                });
            });

            // Top-level Program code has already registered the bearer handler by
            // the time WebApplicationFactory applies its configuration callback.
            // Post-configure that handler with the same values used by
            // TestJwtFactory, rather than depending on process environment timing.
            builder.ConfigureServices(services =>
            {
                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = JwtIssuer,
                        ValidAudience = JwtAudience,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret))
                    };
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
