using System.Reflection;
using DbUp;
using Microsoft.Extensions.Configuration;
using System;

namespace Harbor.Authentication.Data
{
    public static class DatabaseInitializer
    {
        public static void Initialize(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("HarborDb");
            
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = Environment.GetEnvironmentVariable("HarborDb");
            }
            
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                var host = Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost";
                var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5433";
                var database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db";
                var username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser";
                var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234";

                connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};";
            }

            // We skip EnsureDatabase because harbor_db is already created by our Docker environment.
            // EnsureDatabase.For.PostgresqlDatabase(connectionString);

            var upgrader =
                DeployChanges.To
                    .PostgresqlDatabase(connectionString)
                    .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
                    .LogToConsole()
                    .Build();

            var result = upgrader.PerformUpgrade();

            if (!result.Successful)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(result.Error);
                Console.ResetColor();
                throw new Exception("Database migration failed.", result.Error);
            }

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("Success! Database migrations are up to date.");
            Console.ResetColor();
        }
    }
}
