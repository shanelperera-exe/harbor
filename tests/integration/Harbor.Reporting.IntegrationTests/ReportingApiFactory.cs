using System.Text;
using Harbor.Reporting.Data;
using Harbor.Reporting.Repositories;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace Harbor.Reporting.IntegrationTests;

public class ReportingApiFactory : WebApplicationFactory<Program>
{
    public const string JwtSecret = "reporting-integration-test-signing-key-32chars";
    public const string JwtIssuer = "harbor-auth-test";
    public const string JwtAudience = "harbor-web-test";

    public const string TestConnectionString =
        "Host=localhost;Port=5432;Database=harbor_reporting_test;Username=supundharmaratne;Password=;";

    static ReportingApiFactory()
    {
        Environment.SetEnvironmentVariable("JWT_SECRET", JwtSecret);
        Environment.SetEnvironmentVariable("JWT_ISSUER", JwtIssuer);
        Environment.SetEnvironmentVariable("JWT_AUDIENCE", JwtAudience);
        Environment.SetEnvironmentVariable("HarborDb", TestConnectionString);
        Environment.SetEnvironmentVariable("POSTGRES_SERVER", "localhost");
        Environment.SetEnvironmentVariable("POSTGRES_PORT", "5432");
        Environment.SetEnvironmentVariable("POSTGRES_DATABASE", "harbor_reporting_test");
        Environment.SetEnvironmentVariable("POSTGRES_USER", "supundharmaratne");
        Environment.SetEnvironmentVariable("POSTGRES_PASSWORD", "");
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
