using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Harbor.GitHub;
using System.Text;
using Harbor.Caching.Extensions;
using Harbor.Common.Observability;

if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("JWT_SECRET")))
{
    Env.TraversePath().Load();
}

var builder = WebApplication.CreateBuilder(args);
// duplicate builder removed
builder.Services.AddControllers();
builder.Services.AddHarborCaching(builder.Configuration);

builder.Services.AddHealthChecks()
    .AddHarborLiveness("Harbor.Project")
    .AddHarborDbCheck<Harbor.Project.Data.DbConnectionFactory>(f => f.CreateConnection())
    .AddHarborCacheCheck();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins == null || allowedOrigins.Length == 0)
{
    var envOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS");
    if (!string.IsNullOrWhiteSpace(envOrigins))
    {
        allowedOrigins = envOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    }
    else
    {
        allowedOrigins = new[] { "https://harborapp.tech", "https://admin.harborapp.tech", "http://localhost:5173", "http://localhost:5174" };
    }
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Harbor Project API",
        Version = "v1",
        Description = "Endpoints for creating and viewing Harbor projects."
    });

    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token like this: Bearer {your token}"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Read through configuration rather than directly from the process environment.
    // This lets WebApplicationFactory provide isolated test settings without changing
    // JWT values for other tests running in the same process.
    var jwtSecret = builder.Configuration["JWT_SECRET"]
        ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
    var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "harbor";
    var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "harbor-api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddSingleton<Harbor.Project.Data.DbConnectionFactory>();
builder.Services.AddScoped<Harbor.Project.Repositories.IProjectRepository, Harbor.Project.Repositories.ProjectRepository>();
builder.Services.AddScoped<Harbor.Project.Services.IProjectService, Harbor.Project.Services.ProjectService>();
builder.Services.AddScoped<Harbor.Project.Repositories.IServiceRepository, Harbor.Project.Repositories.ServiceRepository>();
builder.Services.AddScoped<Harbor.Project.Services.IServiceService, Harbor.Project.Services.ServiceService>();
builder.Services.AddScoped<Harbor.Project.Repositories.IProjectIntegrationRepository, Harbor.Project.Repositories.ProjectIntegrationRepository>();
builder.Services.AddScoped<Harbor.Project.Services.IProjectIntegrationService, Harbor.Project.Services.ProjectIntegrationService>();
builder.Services.AddScoped<Harbor.Project.Repositories.IServiceDomainRepository, Harbor.Project.Repositories.ServiceDomainRepository>();
builder.Services.AddScoped<Harbor.Project.Services.IServiceDomainService, Harbor.Project.Services.ServiceDomainService>();
builder.Services.AddHttpClient<Harbor.Project.Services.ITokenService, Harbor.Project.Services.TokenService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<Harbor.Project.Services.IGitHubService, Harbor.Project.Services.GitHubService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(20);
});
builder.Services.AddHarborGitHubApp();
builder.Services.AddSingleton<Harbor.Common.Security.IHarborSecretProtector, Harbor.Common.Security.HarborSecretProtector>();

var app = builder.Build();

Harbor.Project.Data.DatabaseInitializer.Initialize(app.Configuration);

app.UseSwagger();
app.UseSwaggerUI();

app.UseCors("DefaultPolicy");
app.UseHarborObservability();
if (!builder.Configuration.GetValue("DisableHttpsRedirection", false))
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseMiddleware<Harbor.Caching.Middleware.TokenBlacklistMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHarborObservability();

await app.RunAsync();

/// <summary>
/// Exposes the top-level Program for WebApplicationFactory-based integration tests.
/// </summary>
public partial class Program { }
