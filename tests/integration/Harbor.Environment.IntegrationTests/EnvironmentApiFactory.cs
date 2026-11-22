using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Harbor.Environment.Services;
using Harbor.Common.Messaging;
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
            ["JWT_SECRET"] = JwtSecret,
            ["JWT_ISSUER"] = JwtIssuer,
            ["JWT_AUDIENCE"] = JwtAudience,
            ["ENVIRONMENT_SECRETS_KEY"] = SecretsKey,
            ["ConnectionStrings:HarborDb"] = _container.GetConnectionString(),
            ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
        }));
        builder.ConfigureServices(services =>
        {
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = JwtIssuer,
                    ValidAudience = JwtAudience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtSecret))
                });
            services.AddSingleton<IProjectServiceClient>(new TestProjectServiceClient(_container));
            services.AddSingleton<IDeploymentServiceClient>(new TestDeploymentServiceClient(_container));
            services.AddSingleton<IHarborEventPublisher>(new NoOpHarborEventPublisher());
        });
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();
        await using var connection = new NpgsqlConnection(_container.GetConnectionString());
        await connection.OpenAsync();

        // These tables belong to other services (Project/Deployment), so this fixture
        // creates just enough of them for the Environment service to resolve project
        // ownership. The columns must match what EnvironmentRepository actually selects,
        // including "PublicId", which it uses to resolve a project by its public id.
        await using var command = new NpgsqlCommand("""
            CREATE TABLE "Projects" (
                "Id" SERIAL PRIMARY KEY,
                "PublicId" VARCHAR(50) NOT NULL DEFAULT '',
                "Name" VARCHAR(100) NOT NULL,
                "OwnerId" INTEGER NOT NULL,
                "CreatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "IsArchived" BOOLEAN NOT NULL DEFAULT FALSE
            );
            CREATE TABLE "Deployments" (
                "Id" SERIAL PRIMARY KEY,
                "PublicId" VARCHAR(50) NOT NULL DEFAULT '',
                "ProjectId" INTEGER NOT NULL,
                "OwnerId" INTEGER NOT NULL,
                "ServiceId" INTEGER,
                "Environment" VARCHAR(100) NOT NULL,
                "Version" VARCHAR(200) NOT NULL,
                "Status" VARCHAR(30) NOT NULL,
                "StartedAt" TIMESTAMPTZ NOT NULL
            );
            CREATE TABLE "Services" (
                "Id" SERIAL PRIMARY KEY,
                "PublicId" VARCHAR(50) NOT NULL DEFAULT '',
                "ProjectId" INTEGER NOT NULL,
                "Name" VARCHAR(200) NOT NULL
            );
            """, connection);
        await command.ExecuteNonQueryAsync();
    }

    public new async Task DisposeAsync() => await _container.DisposeAsync();
}

internal sealed class TestProjectServiceClient(PostgreSqlContainer container) : IProjectServiceClient
{
    public async Task<(bool Exists, int Id, int OwnerId, bool IsArchived)> GetProjectAccessAsync(string projectId)
    {
        await using var connection = new NpgsqlConnection(container.GetConnectionString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = int.TryParse(projectId, out _)
            ? """SELECT "Id", "OwnerId", "IsArchived" FROM "Projects" WHERE "Id"::text = @projectId OR "PublicId" = @projectId"""
            : """SELECT "Id", "OwnerId", "IsArchived" FROM "Projects" WHERE "PublicId" = @projectId""";
        command.Parameters.AddWithValue("projectId", projectId);
        await using var reader = await command.ExecuteReaderAsync();
        if (!await reader.ReadAsync()) return (false, 0, 0, false);
        return (true, reader.GetInt32(0), reader.GetInt32(1), reader.GetBoolean(2));
    }
}

internal sealed class TestDeploymentServiceClient(PostgreSqlContainer container) : IDeploymentServiceClient
{
    public async Task<bool> HasDeploymentHistoryAsync(int projectId, string environmentName)
    {
        await using var connection = new NpgsqlConnection(container.GetConnectionString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = """SELECT EXISTS(SELECT 1 FROM "Deployments" WHERE "ProjectId" = @projectId AND "Environment" = @environmentName)""";
        command.Parameters.AddWithValue("projectId", projectId);
        command.Parameters.AddWithValue("environmentName", environmentName);
        return Convert.ToBoolean(await command.ExecuteScalarAsync());
    }
}
