using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Dapper;
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins ?? Array.Empty<string>())
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
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


var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")!;
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? "HarborAuth";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? "HarborClients";

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


builder.Services.AddSingleton<Harbor.Authentication.Data.DbConnectionFactory>();
builder.Services.AddScoped<Harbor.Authentication.Repositories.IUserRepository, Harbor.Authentication.Repositories.UserRepository>();
builder.Services.AddScoped<Harbor.Authentication.Services.IAuthService, Harbor.Authentication.Services.AuthService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IJwtService, Harbor.Authentication.Services.JwtService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IEmailService, Harbor.Authentication.Services.EmailService>();

var app = builder.Build();

// Run automated database migrations on startup
Harbor.Authentication.Data.DatabaseInitializer.Initialize(app.Configuration);

using (var scope = app.Services.CreateScope())
{
    var userRepository = scope.ServiceProvider.GetRequiredService<Harbor.Authentication.Repositories.IUserRepository>();
    var adminEmail = Environment.GetEnvironmentVariable("ADMIN_EMAIL") ?? "admin@harbor.local";
    var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") ?? "Admin123!";
    var adminUsername = adminEmail.Split('@')[0];

    var existingAdmin = await userRepository.GetByUsernameOrEmailAsync(adminUsername, adminEmail);
    if (existingAdmin == null)
    {
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword);
        var adminUser = new Harbor.Authentication.Models.User
        {
            Username = adminUsername,
            Email = adminEmail,
            PasswordHash = passwordHash,
            Role = Harbor.Authentication.Models.Roles.Admin,
            AvatarSvg = ""
        };
        await userRepository.CreateUserAsync(adminUser);
        Console.WriteLine($"Successfully seeded initial Admin account for {adminEmail}");
    }
    else if (existingAdmin.Role != Harbor.Authentication.Models.Roles.Admin)
    {
        // Force the admin user to have the Admin role if they were created previously
        using var connection = scope.ServiceProvider.GetRequiredService<Harbor.Authentication.Data.DbConnectionFactory>().CreateConnection();
        await Dapper.SqlMapper.ExecuteAsync(connection, "UPDATE \"Users\" SET \"Role\" = @Role WHERE \"Id\" = @Id", new { Role = Harbor.Authentication.Models.Roles.Admin, Id = existingAdmin.Id });
        Console.WriteLine($"Updated existing user '{adminEmail}' to have the Admin role.");
    }
}

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

app.MapGet("/api/test-db", (Harbor.Authentication.Data.DbConnectionFactory dbFactory) =>
{
    try
    {
        using var connection = dbFactory.CreateConnection();
        connection.Open();
        return Results.Ok(new { message = "Database connection successful!" });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database connection failed: {ex.Message}");
    }
});

app.Run();
