using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using DbUp;
using Npgsql;

namespace Harbor.Deployment.Data;

/// <summary>
/// Runs DbUp migrations with Flyway-style checksum validation.
/// Validates that previously applied scripts have not been tampered with
/// before applying any new ones.
/// </summary>
public static class MigrationRunner
{
    private const string ChecksumTable = "schema_checksums";

    public static void Run(string connectionString)
    {
        EnsureChecksumTable(connectionString);
        ValidateAppliedScriptChecksums(connectionString, Assembly.GetExecutingAssembly());

        var upgrader = DeployChanges.To
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

        StoreChecksums(connectionString, Assembly.GetExecutingAssembly());

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine("✓ All migrations are up to date.");
        Console.ResetColor();
    }

    // -------------------------------------------------------------------------
    // Checksum table
    // -------------------------------------------------------------------------

    private static void EnsureChecksumTable(string connectionString)
    {
        using var conn = new NpgsqlConnection(connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"""
            CREATE TABLE IF NOT EXISTS {ChecksumTable} (
                script_name TEXT PRIMARY KEY,
                checksum    TEXT NOT NULL,
                applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """;
        try
        {
            cmd.ExecuteNonQuery();
        }
        catch (PostgresException ex) when (ex.SqlState == "23505")
        {
            // Another service created the table concurrently; safe to ignore.
        }
    }

    // -------------------------------------------------------------------------
    // Validation — fail if a previously applied script has been modified
    // -------------------------------------------------------------------------

    private static void ValidateAppliedScriptChecksums(string connectionString, Assembly assembly)
    {
        var stored = LoadStoredChecksums(connectionString);
        if (stored.Count == 0) return;

        var embedded = LoadEmbeddedChecksums(assembly);
        var violations = new List<string>();

        foreach (var (name, storedHash) in stored)
        {
            if (!embedded.TryGetValue(name, out var currentHash))
            {
                // Script was removed from the assembly after being applied — warn but don't block.
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"⚠  Migration script '{name}' was applied but is no longer present in the assembly.");
                Console.ResetColor();
                continue;
            }

            if (!string.Equals(storedHash, currentHash, StringComparison.OrdinalIgnoreCase))
            {
                violations.Add($"  • {name}\n      stored:  {storedHash}\n      current: {currentHash}");
            }
        }

        if (violations.Count > 0)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("✗ CHECKSUM VIOLATION: The following migration scripts were modified after being applied.");
            Console.WriteLine("  This is not allowed. Restore the original scripts or create a new migration.\n");
            foreach (var v in violations) Console.WriteLine(v);
            Console.ResetColor();
            throw new InvalidOperationException(
                "Migration checksum validation failed. One or more applied scripts have been modified.");
        }
    }

    // -------------------------------------------------------------------------
    // Store checksums for all embedded scripts (idempotent upsert)
    // -------------------------------------------------------------------------

    private static void StoreChecksums(string connectionString, Assembly assembly)
    {
        var checksums = LoadEmbeddedChecksums(assembly);

        using var conn = new NpgsqlConnection(connectionString);
        conn.Open();

        foreach (var (name, hash) in checksums)
        {
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"""
                INSERT INTO {ChecksumTable} (script_name, checksum)
                VALUES (@name, @hash)
                ON CONFLICT (script_name) DO NOTHING;
                """;
            cmd.Parameters.AddWithValue("name", name);
            cmd.Parameters.AddWithValue("hash", hash);
            cmd.ExecuteNonQuery();
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static Dictionary<string, string> LoadStoredChecksums(string connectionString)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        using var conn = new NpgsqlConnection(connectionString);
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = $"SELECT script_name, checksum FROM {ChecksumTable}";
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            result[reader.GetString(0)] = reader.GetString(1);
        return result;
    }

    private static Dictionary<string, string> LoadEmbeddedChecksums(Assembly assembly)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var resourceName in assembly.GetManifestResourceNames()
            .Where(n => n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase)))
        {
            using var stream = assembly.GetManifestResourceStream(resourceName)!;
            using var reader = new StreamReader(stream, Encoding.UTF8);
            var content = reader.ReadToEnd();
            var hash = ComputeSha256(content);

            // Use just the filename (e.g. "0001_CreateUsersTable.sql") as the key,
            // matching how DbUp records script names in schemaversions.
            var scriptName = resourceName.Split('.').TakeLast(2).First() + ".sql";
            result[scriptName] = hash;
        }

        return result;
    }

    private static string ComputeSha256(string content)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(content));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
