using DotNetEnv;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.AspNetCore.HttpOverrides;
using System.Text;
using Dapper;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Harbor.Authentication.Services;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
Env.TraversePath().Load();

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins == null || allowedOrigins.Length == 0)
{
    allowedOrigins = new[] { "http://localhost:5173", "http://localhost:5174" };
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
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


var jwtSecret = builder.Configuration["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET is not configured.");
var jwtIssuer = builder.Configuration["JWT_ISSUER"] ?? "harbor";
var jwtAudience = builder.Configuration["JWT_AUDIENCE"] ?? "harbor-api";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddCookie("External", options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.Cookie.Name = "harbor.external";
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    })
    .AddCookie("ExternalLink", options =>
    {
        options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
        options.Cookie.Name = "harbor.external-link";
        options.Cookie.SameSite = SameSiteMode.None;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    })
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

var googleClientId = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_ID");
var googleClientSecret = Environment.GetEnvironmentVariable("GOOGLE_CLIENT_SECRET");
var publicApiOrigin = Environment.GetEnvironmentVariable("API_GATEWAY_URL") ?? "http://localhost:5000";

static string UsePublicCallbackOrigin(string authorizeUrl, string publicOrigin, PathString callbackPath)
{
    var uri = new Uri(authorizeUrl);
    var query = QueryHelpers.ParseQuery(uri.Query)
        .ToDictionary(pair => pair.Key, pair => (string?)pair.Value.ToString());
    query["redirect_uri"] = $"{publicOrigin.TrimEnd('/')}{callbackPath}";
    return QueryHelpers.AddQueryString(uri.GetLeftPart(UriPartial.Path), query);
}

if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    builder.Services.AddAuthentication().AddGoogle("Google", options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = "External";
        options.CallbackPath = "/api/auth/external/google/callback";
        options.Events.OnRedirectToAuthorizationEndpoint = context =>
        {
            context.Response.Redirect(UsePublicCallbackOrigin(context.RedirectUri, publicApiOrigin, options.CallbackPath));
            return Task.CompletedTask;
        };
        options.Events.OnTicketReceived = context =>
        {
            context.ReturnUri = "/api/auth/external/google/complete";
            return Task.CompletedTask;
        };
    });
}

// GitHub App authentication replaces the previous OAuth App flow.
// One GitHub App handles both user login (user access token) and
// deployments (installation access token).
builder.Services.AddHarborGitHubApp();

builder.Services.AddHttpClient("GitHubAppEmails", client =>
{
    client.BaseAddress = new Uri("https://api.github.com/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Harbor");
    client.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
});

builder.Services.AddScoped<Harbor.Authentication.Services.IEncryptionService, Harbor.Authentication.Services.EncryptionService>();

// Only register the GitHub App auth service and internal endpoints if the App is configured
if (!string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_APP_CLIENT_ID"))
    && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_APP_CLIENT_SECRET"))
    && !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY_BASE64")))
{
    builder.Services.AddScoped<Harbor.Authentication.Services.IGitHubAppAuthService, Harbor.Authentication.Services.GitHubAppAuthService>();
}

builder.Services.AddAuthorization();


builder.Services.AddSingleton<Harbor.Authentication.Data.DbConnectionFactory>();
builder.Services.AddScoped<Harbor.Authentication.Repositories.IUserRepository, Harbor.Authentication.Repositories.UserRepository>();
builder.Services.AddScoped<Harbor.Authentication.Services.IAuthService, Harbor.Authentication.Services.AuthService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IJwtService, Harbor.Authentication.Services.JwtService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IEmailService, Harbor.Authentication.Services.EmailService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IExternalAuthService, Harbor.Authentication.Services.ExternalAuthService>();
builder.Services.AddScoped<Harbor.Authentication.Services.IEncryptionService, Harbor.Authentication.Services.EncryptionService>();

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

app.UseCors("DefaultPolicy");
app.UseForwardedHeaders();
app.UseHttpsRedirection();

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
