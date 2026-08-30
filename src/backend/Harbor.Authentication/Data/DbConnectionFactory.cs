using Npgsql;
using Microsoft.Extensions.Configuration;
using System;

namespace Harbor.Authentication.Data
{
    public class DbConnectionFactory
    {
        private readonly string _connectionString;

        public DbConnectionFactory(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("HarborDb") ?? string.Empty;
            
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                _connectionString = Environment.GetEnvironmentVariable("HarborDb") ?? string.Empty;
            }
            
            if (string.IsNullOrWhiteSpace(_connectionString))
            {
                var host = Environment.GetEnvironmentVariable("POSTGRES_SERVER") ?? "localhost";
                var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5433";
                var database = Environment.GetEnvironmentVariable("POSTGRES_DATABASE") ?? "harbor_db";
                var username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "harboruser";
                var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "harbor@1234";

                _connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};";
            }
        }

        public NpgsqlConnection CreateConnection()
        {
            return new NpgsqlConnection(_connectionString);
        }
    }
}