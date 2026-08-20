var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<Harbor.Api.Data.DbConnectionFactory>();

// Add services to the container.
builder.Services.AddControllers();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Allow the React app (running on port 5173) to call this API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");   // <-- add this, before UseAuthorization

app.UseAuthorization();

app.MapControllers();

app.Run();