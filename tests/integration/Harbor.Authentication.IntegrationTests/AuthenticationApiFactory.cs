using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text;
using Testcontainers.PostgreSql;

namespace Harbor.Authentication.IntegrationTests;

public class AuthenticationApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public AuthenticationApiFactory()
    {
        // Note: no process-wide environment variables are set here on purpose.
        // Program.cs calls `Env.TraversePath().Load()`, which loads the repository's
        // .env and overwrites JWT_* environment variables, so reading them back in
        // ConfigureWebHost would validate tokens against the developer's .env issuer
        // instead of the test issuer. The values below are supplied through
        // ConfigureAppConfiguration instead, which is what the app actually resolves.
    }

    public const string JwtSecret = "auth-integration-test-key-at-least-32chars";
    public const string JwtIssuer = "harbor-auth-test";
    public const string JwtAudience = "harbor-web-test";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("harbor_auth_test")
        .WithUsername("harbor_test")
        .WithPassword("harbor_test")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JWT_SECRET"] = JwtSecret,
                ["JWT_ISSUER"] = JwtIssuer,
                ["JWT_AUDIENCE"] = JwtAudience,
                ["ConnectionStrings:HarborDb"] = _db.GetConnectionString(),
                ["Cors:AllowedOrigins:0"] = "http://localhost:5173",
                ["SMTP_HOST"] = "localhost",
                ["SMTP_PORT"] = "1025",
                ["SMTP_USER"] = "",
                ["SMTP_PASS"] = "",
                ["SMTP_FROM"] = "noreply@test.com",
                ["FRONTEND_URL"] = "http://localhost:5173"
            }));

        // Post-configure the bearer handler with the same constants used by TestJwtFactory
        // and by the app's own configuration above, so a token minted by /api/auth/login
        // validates. Reading process environment variables here would be non-deterministic
        // because Program.cs loads the repository's .env file.
        builder.ConfigureServices(services =>
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
                }));
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();

        // Trigger the application startup so Program.cs runs the DbUp migrations
        using var client = CreateClient();

        await using var connection = new NpgsqlConnection(_db.GetConnectionString());
        await connection.OpenAsync();

        // Seed a test user for login and profile tests.
        // "PublicId" is NOT NULL since migration 0007, so it must be supplied here.
        await using var seed = new NpgsqlCommand($"""
            INSERT INTO "Users" ("PublicId", "Username", "Email", "PasswordHash", "Role", "AvatarSvg") VALUES
            ('usr-00000000000000000001', 'testuser', 'testuser@example.com', '$2a$11$0FfO9bNqfLqQoGz/lWn2r.dE5y.T/j0XqM0vNlV/L8lZ/U7P3q/B6', 'User', '<svg></svg>'),
            ('usr-00000000000000000002', 'adminuser', 'admin@example.com', '$2a$11$0FfO9bNqfLqQoGz/lWn2r.dE5y.T/j0XqM0vNlV/L8lZ/U7P3q/B6', 'Admin', '<svg></svg>')
            ON CONFLICT DO NOTHING;
            """, connection);
        // The password hash is for 'Password123!'
        await seed.ExecuteNonQueryAsync();
    }

    public new async Task DisposeAsync() => await _db.DisposeAsync();
}
