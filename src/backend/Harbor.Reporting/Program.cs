using DotNetEnv;
using Harbor.Caching.Extensions;
using Harbor.Reporting.Data;
using Harbor.Reporting.Repositories;
using Harbor.Reporting.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

// Load .env file configurations
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// ── Services ───────────────────────────────────────────────────────────────────

builder.Services.AddControllers();
builder.Services.AddHarborCaching(builder.Configuration);
builder.Services.AddSignalR();

// Register Phase 3 Native Adapter Dependencies
builder.Services.AddSingleton<Harbor.Reporting.Services.IActiveSubscriptionTracker, Harbor.Reporting.Services.ActiveSubscriptionTracker>();
builder.Services.AddHttpClient<Harbor.Reporting.Services.IProjectApiClient, Harbor.Reporting.Services.ProjectApiClient>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.VercelLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.AwsLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.AzureLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.GcpLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.RenderLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.DigitalOceanLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.KubernetesLogAdapter>();
builder.Services.AddTransient<Harbor.Reporting.Adapters.ILogProviderAdapter, Harbor.Reporting.Adapters.DockerLogAdapter>();
builder.Services.AddSingleton<Harbor.Reporting.Factories.IProviderAdapterFactory, Harbor.Reporting.Factories.ProviderAdapterFactory>();
builder.Services.AddHostedService<Harbor.Reporting.Workers.NativeLogPollerWorker>();

// Database
builder.Services.AddSingleton<ReportingDbConnectionFactory>();

// Reporting feature (US-22)
builder.Services.AddScoped<IDeploymentReportRepository, DeploymentReportRepository>();
builder.Services.AddScoped<IReportService, ReportService>();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins == null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost:5173", "http://localhost:5174" };
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials());
});

// JWT Authentication (mirrors the deployment service configuration)
var jwtSecret   = builder.Configuration["JWT_SECRET"]   ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
var jwtIssuer   = builder.Configuration["JWT_ISSUER"]   ?? "harbor";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "harbor-api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = jwtIssuer,
        ValidAudience            = jwtAudience,
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    });
builder.Services.AddAuthorization();

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title   = "Harbor Reporting API",
        Version = "v1",
        Description = "Dynamic deployment reports (US-22). " +
                      "All queries use parameterized SQL — no user-supplied values are concatenated into SQL strings."
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name        = "Authorization",
        Type        = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme      = "Bearer",
        BearerFormat = "JWT",
        In          = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT token: Bearer {your token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id   = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ── Application pipeline ───────────────────────────────────────────────────────

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultPolicy");

if (!builder.Configuration.GetValue("DisableHttpsRedirection", false))
    app.UseHttpsRedirection();

app.UseAuthentication();
app.UseMiddleware<Harbor.Caching.Middleware.TokenBlacklistMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHub<Harbor.Reporting.Hubs.ServiceLogsHub>("/hubs/logs");

app.Run();

public partial class Program { }
