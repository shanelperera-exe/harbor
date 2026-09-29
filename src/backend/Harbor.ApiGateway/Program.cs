using DotNetEnv;
using Microsoft.AspNetCore.HttpOverrides;
using Npgsql;
using Yarp.ReverseProxy.Transforms;

// Load .env file configurations by traversing up the directory tree
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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
                context.HttpContext.Response.Headers["Vary"] = "Origin";
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
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI();
    }

    app.UseCors();
    app.UseForwardedHeaders();
    app.UseHttpsRedirection();

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

    // Database Health Check Endpoint
    app.MapGet("/health", async ([Microsoft.AspNetCore.Mvc.FromServices] NpgsqlDataSource dataSource) =>
    {
        try
        {
            await using var command = dataSource.CreateCommand("SELECT 1");
            await command.ExecuteScalarAsync();
            return Results.Ok(new { status = "Healthy", database = "Connected" });
        }
        catch (Exception ex)
        {
            return Results.Problem(detail: ex.Message, title: "Database Connection Failed", statusCode: 500);
        }
    });

    app.Run();
