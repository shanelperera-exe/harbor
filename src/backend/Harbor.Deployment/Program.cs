using DotNetEnv;
using Harbor.Deployment.Data;
using Harbor.Deployment.Repositories;
using Harbor.Deployment.Services;
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
builder.Services.AddCors(options => options.AddPolicy("DefaultPolicy", policy =>
    policy.WithOrigins(allowedOrigins ?? Array.Empty<string>()).AllowAnyHeader().AllowAnyMethod()));
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var jwtSecret = builder.Configuration["JWT_SECRET"]
    ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "harbor-auth";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "harbor-web";
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

var app = builder.Build();
DatabaseInitializer.Initialize(app.Configuration);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("DefaultPolicy");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
