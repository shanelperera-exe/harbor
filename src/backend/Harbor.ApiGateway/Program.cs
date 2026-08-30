using DotNetEnv;
using Npgsql;

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
    Password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD")
};

if (!string.IsNullOrEmpty(connectionStringBuilder.Host))
{
    builder.Services.AddSingleton(NpgsqlDataSource.Create(connectionStringBuilder.ConnectionString));
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

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
