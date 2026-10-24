using DotNetEnv;
using Microsoft.AspNetCore.HttpOverrides;
using Npgsql;
using Yarp.ReverseProxy.Transforms;
using Harbor.Caching.Extensions;
using Harbor.Common.Observability;

// Load .env file configurations by traversing up the directory tree
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddHarborCaching(builder.Configuration);
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHealthChecks()
    .AddHarborLiveness("Harbor.ApiGateway")
    .AddHarborDataSourceCheck()
    .AddHarborCacheCheck();

// Configure ADO.NET PostgreSQL Connection dynamically from environment variables
var connectionStringBuilder = new NpgsqlConnectionStringBuilder
{
    Host = Environment.GetEnvironmentVariable("POSTGRES_SERVER"),
    Port = int.TryParse(Environment.GetEnvironmentVariable("POSTGRES_PORT"), out var port) ? port : 5432,
    Database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE"),
    Username = Environment.GetEnvironmentVariable("POSTGRES_USER"),
    Password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD"),
    SslMode = Enum.TryParse<SslMode>(Environment.GetEnvironmentVariable("POSTGRES_SSL_MODE"), true, out var sslMode)
        ? sslMode
        : SslMode.Require,
    TrustServerCertificate = true
};

if (!string.IsNullOrEmpty(connectionStringBuilder.Host))
{
    builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionStringBuilder.ConnectionString));
}

var allOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

if (allOrigins.Length == 0)
{
    allOrigins = new[] { "https://harborapp.tech", "https://admin.harborapp.tech", "http://localhost:5173", "http://localhost:5174" };
}

var allowedOriginsSet = new HashSet<string>(allOrigins, StringComparer.OrdinalIgnoreCase);

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"))
    .AddTransforms(transformBuilder =>
    {
        transformBuilder.AddResponseTransform(async context =>
        {
            var origin = context.HttpContext.Request.Headers["Origin"].ToString();
            if (!string.IsNullOrEmpty(origin) && allowedOriginsSet.Contains(origin))
            {
                context.HttpContext.Response.Headers["Access-Control-Allow-Origin"] = origin;
                context.HttpContext.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                if (!context.HttpContext.Response.Headers.ContainsKey("Vary"))
                {
                    context.HttpContext.Response.Headers["Vary"] = "Origin";
                }
            }
        });
    });

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontendOrigins",
        b => b.WithOrigins(allOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
    options.AddDefaultPolicy(
        b => b.WithOrigins(allOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger-docs/auth/v1/swagger.json", "Harbor.Authentication API");
    c.SwaggerEndpoint("/swagger-docs/project/v1/swagger.json", "Harbor.Project API");
    c.SwaggerEndpoint("/swagger-docs/environment/v1/swagger.json", "Harbor.Environment API");
    c.SwaggerEndpoint("/swagger-docs/deployment/v1/swagger.json", "Harbor.Deployment API");
    c.SwaggerEndpoint("/swagger-docs/reporting/v1/swagger.json", "Harbor.Reporting API");
    c.RoutePrefix = "swagger";
    c.DocumentTitle = "Harbor Platform API Documentation";
});

app.MapGet("/", () => Results.Redirect("/swagger"));

app.UseForwardedHeaders();
app.UseCors();
app.UseHarborObservability();
if (!builder.Configuration.GetValue("DisableHttpsRedirection", false))
{
    app.UseHttpsRedirection();
}

// Handle GitHub App installation callback - redirect to frontend
app.MapGet("/github/install/callback", (HttpContext ctx) =>
{
    var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
    var queryString = ctx.Request.QueryString.HasValue ? ctx.Request.QueryString.Value : "";
    return Results.Redirect($"{frontendUrl.TrimEnd('/')}/github/install/callback{queryString}");
});

app.UseAuthorization();

app.MapControllers();
app.MapReverseProxy();
app.MapHarborObservability();

await app.RunAsync();
