using System.Text;
using Harbor.Reporting.Data;
using Harbor.Reporting.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

using Xunit;

namespace Harbor.Reporting.IntegrationTests;

public class ReportingApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string JwtSecret = "reporting-integration-test-signing-key-32chars";
    public const string JwtIssuer = "harbor-auth-test";
    public const string JwtAudience = "harbor-web-test";

    public static string TestConnectionString =>
        Environment.GetEnvironmentVariable("HarborDb") ??
        $"Host={Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost"};" +
        $"Port={Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5433"};" +
        $"Database={Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db"};" +
        $"Username={Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser"};" +
        $"Password={Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234"};" +
        $"Trust Server Certificate=true;";

    public async Task InitializeAsync()
    {
        try
        {
            await using var conn = new Npgsql.NpgsqlConnection(TestConnectionString);
            await conn.OpenAsync();

            await using var setup = new Npgsql.NpgsqlCommand("""
                CREATE TABLE IF NOT EXISTS "Users" (
                    "Id" SERIAL PRIMARY KEY,
                    "PublicId" VARCHAR(50) DEFAULT 'usr-test',
                    "Username" VARCHAR(100) NOT NULL,
                    "Email" VARCHAR(200),
                    "PasswordHash" VARCHAR(255) NOT NULL DEFAULT 'test-hash',
                    "Role" VARCHAR(50) NOT NULL DEFAULT 'User'
                );
                CREATE TABLE IF NOT EXISTS "Projects" (
                    "Id" SERIAL PRIMARY KEY,
                    "PublicId" VARCHAR(50),
                    "Name" VARCHAR(100) NOT NULL,
                    "OwnerId" INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS "Services" (
                    "Id" SERIAL PRIMARY KEY,
                    "PublicId" VARCHAR(50),
                    "ProjectId" INTEGER,
                    "Name" VARCHAR(100) NOT NULL,
                    "Type" VARCHAR(50) NOT NULL DEFAULT 'Backend'
                );
                CREATE TABLE IF NOT EXISTS "Deployments" (
                    "Id" SERIAL PRIMARY KEY,
                    "PublicId" VARCHAR(50),
                    "ServiceId" INTEGER,
                    "OwnerId" INTEGER,
                    "Environment" VARCHAR(50),
                    "Version" VARCHAR(50),
                    "CommitSha" VARCHAR(100),
                    "CommitMessage" TEXT,
                    "Status" VARCHAR(50),
                    "StartedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "CompletedAt" TIMESTAMPTZ,
                    "FailureReason" TEXT
                );

                CREATE TABLE IF NOT EXISTS "AuditLogs" (
                    "Id" SERIAL PRIMARY KEY,
                    "Timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
                    "Actor" VARCHAR(100) NOT NULL,
                    "Action" VARCHAR(100) NOT NULL,
                    "Target" VARCHAR(100) NOT NULL,
                    "IpAddress" VARCHAR(50) NOT NULL,
                    "Severity" VARCHAR(50) NOT NULL,
                    "Details" TEXT
                );
            """, conn);
            await setup.ExecuteNonQueryAsync();
        }
        catch
        {
            // If postgres is not reachable at initialization, let Program.cs proceed
        }
    }

    public new Task DisposeAsync() => Task.CompletedTask;

    static ReportingApiFactory()
    {
        try
        {
            DotNetEnv.Env.TraversePath().Load();
        }
        catch
        {
            // Ignore if .env is missing or unreadable
        }

        Environment.SetEnvironmentVariable("JWT_SECRET", JwtSecret);
        Environment.SetEnvironmentVariable("JWT_ISSUER", JwtIssuer);
        Environment.SetEnvironmentVariable("JWT_AUDIENCE", JwtAudience);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = JwtSecret,
                ["JWT_ISSUER"] = JwtIssuer,
                ["JWT_AUDIENCE"] = JwtAudience,
                ["ConnectionStrings:HarborDb"] = TestConnectionString,
                ["DisableHttpsRedirection"] = "true"
            });
        });

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
}
