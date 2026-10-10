using DotNetEnv;
using Harbor.Caching.Extensions;

// Load .env file configurations
Env.Load();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

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
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("DefaultPolicy");
if (!builder.Configuration.GetValue("DisableHttpsRedirection", false))
    app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
app.MapHub<Harbor.Reporting.Hubs.ServiceLogsHub>("/hubs/logs");

app.Run();
