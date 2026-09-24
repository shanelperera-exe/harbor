using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text;
using Testcontainers.PostgreSql;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// Boots the real Harbor.Deployment API (Program.cs) against a throwaway Postgres
/// container, runs the service's own DbUp migrations, then seeds the minimum
/// reference data (Projects, Services, Environments) that deployment tests need.
///
/// Tests exercise Controller → Service → Repository → real DB end-to-end,
/// the same path a real request takes in production.
/// </summary>
public class DeploymentApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Test-only signing values — mirrored in TestJwtFactory.
    public const string JwtSecret  = "deployment-integration-test-key-at-least-32chars";
    public const string JwtIssuer  = "harbor-auth-test";
    public const string JwtAudience = "harbor-web-test";

    // Stable seed IDs used across all tests.
    public const int SeedOwnerId      = 1001;
    public const int OtherOwnerId     = 1002;
    public const int SeedProjectId    = 10;
    public const int SeedServiceId    = 20;
    public const int OtherServiceId   = 21;

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("harbor_deployment_test")
        .WithUsername("harbor_test")
        .WithPassword("harbor_test")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"]  = JwtSecret,
                ["JWT_ISSUER"]  = JwtIssuer,
                ["JWT_AUDIENCE"] = JwtAudience,
                // Point the real DbConnectionFactory at the Testcontainers instance.
                ["ConnectionStrings:HarborDb"] = _db.GetConnectionString(),
                ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
            }));

        // Override the JWT validation params so tokens minted by TestJwtFactory are trusted.
        builder.ConfigureServices(services =>
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidateAudience         = true,
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer              = JwtIssuer,
                    ValidAudience            = JwtAudience,
                    IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret))
                }));
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        // DbUp migrations (in Program.cs → DatabaseInitializer.Initialize) run automatically
        // when the host is first built. We need the supporting tables from other services
        // (Projects, Services, Environments) to be present so FK lookups and environment
        // resolution work exactly as they do in production.
        await using var connection = new NpgsqlConnection(_db.GetConnectionString());
        await connection.OpenAsync();

        // Create the cross-service reference tables that the Deployment service
        // reads but does not own.  The real tables are managed by Harbor.Project
        // and Harbor.Environment; here we replicate the minimal column set that
        // DeploymentRepository actually queries.
        await using var setup = new NpgsqlCommand("""
            -- Projects table (owned by Harbor.Project)
            CREATE TABLE IF NOT EXISTS "Projects" (
                "Id"         SERIAL  PRIMARY KEY,
                "PublicId"   VARCHAR(50) NOT NULL,
                "Name"       VARCHAR(100) NOT NULL,
                "OwnerId"    INTEGER NOT NULL,
                "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE,
                "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            -- Services table (owned by Harbor.Project)
            CREATE TABLE IF NOT EXISTS "Services" (
                "Id"        SERIAL  PRIMARY KEY,
                "PublicId"  VARCHAR(50) NOT NULL,
                "ProjectId" INTEGER NOT NULL REFERENCES "Projects"("Id"),
                "Name"      VARCHAR(100) NOT NULL
            );

            -- Environments table (owned by Harbor.Environment)
            CREATE TABLE IF NOT EXISTS "Environments" (
                "Id"        SERIAL  PRIMARY KEY,
                "ProjectId" INTEGER NOT NULL,
                "Name"      VARCHAR(100) NOT NULL,
                "Type"      VARCHAR(50) NOT NULL,
                "IsActive"  BOOLEAN NOT NULL DEFAULT TRUE
            );
            """, connection);
        await setup.ExecuteNonQueryAsync();

        // Seed the Projects / Services / Environments the tests will reference.
        await using var seed = new NpgsqlCommand($"""
            INSERT INTO "Projects" ("Id", "PublicId", "Name", "OwnerId") VALUES
                ({SeedProjectId}, 'prj-deployment-test', 'test-project', {SeedOwnerId}),
                ({SeedProjectId + 1}, 'prj-deployment-other', 'other-project', {OtherOwnerId})
            ON CONFLICT DO NOTHING;

            INSERT INTO "Services" ("Id", "PublicId", "ProjectId", "Name") VALUES
                ({SeedServiceId},     'srv-deployment-test',  {SeedProjectId},     'test-service'),
                ({OtherServiceId},    'srv-deployment-other', {SeedProjectId + 1}, 'other-service')
            ON CONFLICT DO NOTHING;

            INSERT INTO "Environments" ("ProjectId", "Name", "Type", "IsActive") VALUES
                ({SeedProjectId},     'production', 'Production', TRUE),
                ({SeedProjectId},     'staging',    'Staging',    TRUE),
                ({SeedProjectId},     'dev',        'Development',TRUE),
                ({SeedProjectId},     'inactive',   'Production', FALSE),
                ({SeedProjectId + 1}, 'production', 'Production', TRUE)
            ON CONFLICT DO NOTHING;
            """, connection);
        await seed.ExecuteNonQueryAsync();
    }

    public new async Task DisposeAsync() => await _db.DisposeAsync();
}
