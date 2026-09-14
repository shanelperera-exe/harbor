using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Testcontainers.PostgreSql;
using Npgsql;
using Xunit;

namespace Harbor.Environment.IntegrationTests;

public class EnvironmentApiFactory : WebApplicationFactory<global::Program>, IAsyncLifetime
{
    public const string JwtSecret = "environment-integration-key-at-least-32chars";
    public const string JwtIssuer = "harbor-auth-test";
    public const string JwtAudience = "harbor-web-test";
    public const string SecretsKey = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder().WithImage("postgres:16-alpine")
        .WithDatabase("harbor_test").WithUsername("harbor_test").WithPassword("harbor_test").Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["JWT_SECRET"] = JwtSecret, ["JWT_ISSUER"] = JwtIssuer, ["JWT_AUDIENCE"] = JwtAudience,
            ["ENVIRONMENT_SECRETS_KEY"] = SecretsKey,
            ["ConnectionStrings:HarborDb"] = _container.GetConnectionString(), ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
        }));
        builder.ConfigureServices(services => services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
                ValidIssuer = JwtIssuer, ValidAudience = JwtAudience, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret))
            }));
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await using var connection = new NpgsqlConnection(_container.GetConnectionString());
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("""
            CREATE TABLE "Projects" (
                "Id" SERIAL PRIMARY KEY, "Name" VARCHAR(100) NOT NULL, "OwnerId" INTEGER NOT NULL,
                "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE
            );
            CREATE TABLE "Deployments" (
                "Id" SERIAL PRIMARY KEY, "ProjectId" INTEGER NOT NULL, "OwnerId" INTEGER NOT NULL,
                "Environment" VARCHAR(100) NOT NULL, "Version" VARCHAR(200) NOT NULL,
                "Status" VARCHAR(30) NOT NULL, "StartedAt" TIMESTAMPTZ NOT NULL
            );
            """, connection);
        await command.ExecuteNonQueryAsync();
    }

    public new async Task DisposeAsync() => await _container.DisposeAsync();
}
