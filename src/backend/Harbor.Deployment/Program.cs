using DotNetEnv;
using Harbor.Deployment.Data;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
using Harbor.GitHub;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("JWT_SECRET")))
{
    Env.TraversePath().Load();
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
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
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
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

var jwtSecret = builder.Configuration["JWT_SECRET"]
    ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "harbor";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "harbor-api";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
    });
builder.Services.AddAuthorization();
builder.Services.AddSingleton<DbConnectionFactory>();
builder.Services.AddScoped<IDeploymentRepository, DeploymentRepository>();
builder.Services.AddScoped<IDeploymentService, DeploymentService>();
builder.Services.AddScoped<IInstallationTokenResolver, InstallationTokenResolver>();
builder.Services.AddHarborGitHubApp();
builder.Services.Configure<GitHubActionsOptions>(options =>
{
    options.ApiBaseUrl = builder.Configuration["GITHUB_API_BASE_URL"] ?? "https://api.github.com/";
    options.DefaultWorkflowFile = builder.Configuration["GITHUB_ACTIONS_WORKFLOW"] ?? "deploy.yml";
    options.AuthServiceClientUrl = builder.Configuration["AUTH_SERVICE_URL"] ?? "http://authentication-service:8080";
});
builder.Services.AddHttpClient<IGitHubActionsClient, GitHubActionsClient>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<GitHubActionsOptions>>().Value;
    client.BaseAddress = new Uri(options.ApiBaseUrl);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor-Deployment-Service");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
});
builder.Services.AddHttpClient<IInstallationTokenResolver, InstallationTokenResolver>((services, client) =>
{
    var options = services.GetRequiredService<Microsoft.Extensions.Options.IOptions<GitHubActionsOptions>>().Value;
    client.BaseAddress = new Uri(options.AuthServiceClientUrl ?? "http://authentication-service:8080");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor-Deployment-Service");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
});

var app = builder.Build();
DatabaseInitializer.Initialize(app.Configuration);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultPolicy");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
