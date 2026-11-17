using Npgsql;

namespace Harbor.Common.Data;

public static class PostgresDatabaseHelper
{
    /// <summary>
    /// Ensures the target PostgreSQL database exists, creating it via the "postgres"
    /// maintenance database if missing. Safe to call on every service startup.
    /// </summary>
    public static void EnsureDatabaseExists(string connectionString)
    {
        var builder = new NpgsqlConnectionStringBuilder(connectionString);
        var targetDb = builder.Database;
        if (string.IsNullOrWhiteSpace(targetDb) ||
            string.Equals(targetDb, "postgres", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        // Validate identifier to prevent SQL injection (only alphanumeric and underscore allowed).
        foreach (var ch in targetDb)
        {
            if (!char.IsLetterOrDigit(ch) && ch != '_')
            {
                throw new ArgumentException($"Invalid database name '{targetDb}'.", nameof(connectionString));
            }
        }

        builder.Database = "postgres";

        using var conn = new NpgsqlConnection(builder.ConnectionString);
        conn.Open();

        using var existsCmd = conn.CreateCommand();
        existsCmd.CommandText = "SELECT 1 FROM pg_database WHERE datname = @name;";
        existsCmd.Parameters.AddWithValue("name", targetDb);

        if (existsCmd.ExecuteScalar() is not null)
        {
            return;
        }

        using var createCmd = conn.CreateCommand();
        createCmd.CommandText = $"CREATE DATABASE \"{targetDb}\";";
        createCmd.ExecuteNonQuery();
    }
}
