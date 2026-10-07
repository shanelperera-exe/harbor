using Harbor.Deployment.Kafka;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
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
    public const string SeedRepoFullName = "test-owner/test-repo";

    internal readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
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
        // Also replace GitHub-related services with test doubles so deployment creation
        // does not require a live GitHub connection.
        builder.ConfigureServices(services =>
        {
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
                });

            services.RemoveAll<IGitHubActionsClient>();
            services.AddSingleton<IGitHubActionsClient, TestGitHubActionsClient>();
            services.RemoveAll<IInstallationTokenResolver>();
            services.AddSingleton<IInstallationTokenResolver, TestInstallationTokenResolver>();

            // Replace the real Kafka producer. It would otherwise read bootstrap servers
            // from the developer's .env and block on connection timeouts.
            services.RemoveAll<IKafkaProducerService>();
            services.AddSingleton<IKafkaProducerService, TestKafkaProducerService>();
        });
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
                "PublicId"   VARCHAR(50),
                "Name"       VARCHAR(100) NOT NULL,
                "OwnerId"    INTEGER NOT NULL,
                "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE,
                "CreatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
            );

            -- Services table (owned by Harbor.Project)
            CREATE TABLE IF NOT EXISTS "Services" (
                "Id"            SERIAL  PRIMARY KEY,
                "PublicId"      VARCHAR(50),
                "ProjectId"     INTEGER NOT NULL REFERENCES "Projects"("Id"),
                "Name"          VARCHAR(100) NOT NULL,
                "Type"          VARCHAR(50) NOT NULL DEFAULT 'Backend',
                "RepositoryName" VARCHAR(500),
                "RepositoryBranch" VARCHAR(200),
                "WorkflowFile"  VARCHAR(200)
            );

            -- Users table (owned by Harbor.Authentication)
            -- DeploymentRepository LEFT JOINs Users to show who triggered a deployment.
            CREATE TABLE IF NOT EXISTS "Users" (
                "Id"       SERIAL  PRIMARY KEY,
                "Username" VARCHAR(100) NOT NULL,
                "Email"    VARCHAR(255) NOT NULL DEFAULT ''
            );

            -- Environments table (owned by Harbor.Environment)
            -- DeploymentRepository.GetEnvironmentByNameAsync selects
            -- "IsActive", "Type" and "DeploymentUrl", so "DeploymentUrl" must exist here.
            CREATE TABLE IF NOT EXISTS "Environments" (
                "Id"           SERIAL  PRIMARY KEY,
                "PublicId"     VARCHAR(50),
                "ProjectId"    INTEGER NOT NULL,
                "Name"         VARCHAR(100) NOT NULL,
                "Type"         VARCHAR(50) NOT NULL,
                "DeploymentUrl" VARCHAR(500),
                "IsActive"     BOOLEAN NOT NULL DEFAULT TRUE
            );

            -- Deployments table (owned by Harbor.Deployment)
            CREATE TABLE IF NOT EXISTS "Deployments" (
                "Id" SERIAL PRIMARY KEY,
                "ProjectId" INTEGER NOT NULL,
                "OwnerId" INTEGER NOT NULL,
                "Environment" VARCHAR(100) NOT NULL,
                "Version" VARCHAR(200) NOT NULL,
                "CommitSha" VARCHAR(100),
                "Status" VARCHAR(30) NOT NULL,
                "StartedAt" TIMESTAMPTZ NOT NULL,
                "CompletedAt" TIMESTAMPTZ,
                "FailureReason" TEXT
            );

            CREATE INDEX IF NOT EXISTS "IX_Deployments_Owner_Project_StartedAt"
                ON "Deployments" ("OwnerId", "ProjectId", "StartedAt" DESC);
            """, connection);
        await setup.ExecuteNonQueryAsync();

        // Seed the Projects / Services / Environments the tests will reference.
        await using var seed = new NpgsqlCommand($"""
            INSERT INTO "Projects" ("Id", "Name", "OwnerId") VALUES
                ({SeedProjectId}, 'test-project', {SeedOwnerId}),
                ({SeedProjectId + 1}, 'other-project', {OtherOwnerId})
            ON CONFLICT DO NOTHING;

            INSERT INTO "Services" ("Id", "PublicId", "ProjectId", "Name", "Type", "RepositoryName", "WorkflowFile") VALUES
                ({SeedServiceId},     '{Guid.NewGuid():N}', {SeedProjectId},     'test-service',  'Backend', '{SeedRepoFullName}', 'ci.yml'),
                ({OtherServiceId},    '{Guid.NewGuid():N}', {SeedProjectId + 1}, 'other-service', 'Backend', 'other-owner/other-repo', 'ci.yml')
            ON CONFLICT DO NOTHING;

            INSERT INTO "Users" ("Id", "Username") VALUES
                ({SeedOwnerId},  'test-owner'),
                ({OtherOwnerId}, 'other-owner')
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

    /// <summary>
    /// Creates a project, service and environments owned by <paramref name="ownerId"/> and
    /// returns the new service's id.
    ///
    /// Deployment history is scoped to the projects a caller owns
    /// (DeploymentRepository filters on p."OwnerId"), so a test that wants history results
    /// for its own user must deploy to a service that user owns. The shared seeded service
    /// belongs to <see cref="SeedOwnerId"/>, so a different caller legitimately sees none of it.
    /// </summary>
    public async Task<int> ProvisionServiceForOwnerAsync(int ownerId)
    {
        await using var connection = new NpgsqlConnection(_db.GetConnectionString());
        await connection.OpenAsync();

        var suffix = Guid.NewGuid().ToString("N")[..8];

        int projectId;
        await using (var projectCommand = new NpgsqlCommand($"""
            INSERT INTO "Projects" ("PublicId", "Name", "OwnerId")
            VALUES ('prj-{suffix}', 'owned-project-{suffix}', @ownerId)
            RETURNING "Id";
            """, connection))
        {
            projectCommand.Parameters.AddWithValue("ownerId", ownerId);
            projectId = Convert.ToInt32(await projectCommand.ExecuteScalarAsync());
        }

        int serviceId;
        await using (var serviceCommand = new NpgsqlCommand($"""
            INSERT INTO "Services" ("PublicId", "ProjectId", "Name", "Type", "RepositoryName", "WorkflowFile")
            VALUES ('srv-{suffix}', @projectId, 'owned-service-{suffix}', 'Backend', 'owner-{suffix}/repo', 'ci.yml')
            RETURNING "Id";
            """, connection))
        {
            serviceCommand.Parameters.AddWithValue("projectId", projectId);
            serviceId = Convert.ToInt32(await serviceCommand.ExecuteScalarAsync());
        }

        await using (var environmentCommand = new NpgsqlCommand($"""
            INSERT INTO "Environments" ("ProjectId", "Name", "Type", "IsActive") VALUES
                (@projectId, 'production', 'Production', TRUE),
                (@projectId, 'staging',    'Staging',    TRUE),
                (@projectId, 'dev',        'Development',TRUE);
            """, connection))
        {
            environmentCommand.Parameters.AddWithValue("projectId", projectId);
            await environmentCommand.ExecuteNonQueryAsync();
        }

        return serviceId;
    }

    public new async Task DisposeAsync() => await _db.DisposeAsync();
}
