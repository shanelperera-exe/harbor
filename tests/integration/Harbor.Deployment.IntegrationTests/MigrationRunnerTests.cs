using Npgsql;
using Testcontainers.PostgreSql;
using Xunit;
using MigrationRunner = Harbor.Deployment.Data.MigrationRunner;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// Exercises the Flyway-style checksum validation paths of MigrationRunner:
/// fresh install, idempotent re-run, removed-script warning, tampered-script violation.
/// </summary>
public class MigrationRunnerTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .WithDatabase("harbor_migration_test")
        .WithUsername("harbor_test")
        .WithPassword("harbor_test")
        .Build();

    public Task InitializeAsync() => _db.StartAsync();
    public async Task DisposeAsync() => await _db.DisposeAsync();

    private async Task<long> ScalarAsync(string sql)
    {
        await using var conn = new NpgsqlConnection(_db.GetConnectionString());
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        return Convert.ToInt64(await cmd.ExecuteScalarAsync());
    }

    private async Task ExecAsync(string sql)
    {
        await using var conn = new NpgsqlConnection(_db.GetConnectionString());
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(sql, conn);
        await cmd.ExecuteNonQueryAsync();
    }

    [Fact]
    public async Task Run_FreshThenRepeatedThenRemovedThenTampered_BehavesAsExpected()
    {
        var cs = _db.GetConnectionString();

        // Deployment scripts reference tables owned by other services.
        await ExecAsync("""
            CREATE TABLE IF NOT EXISTS "Projects" ("Id" SERIAL PRIMARY KEY, "PublicId" VARCHAR(50), "Name" VARCHAR(100) NOT NULL DEFAULT '', "OwnerId" INTEGER NOT NULL DEFAULT 1);
            CREATE TABLE IF NOT EXISTS "Services" ("Id" SERIAL PRIMARY KEY, "PublicId" VARCHAR(50), "ProjectId" INTEGER, "Name" VARCHAR(100) NOT NULL DEFAULT '');
            CREATE TABLE IF NOT EXISTS "Users" ("Id" SERIAL PRIMARY KEY, "Username" VARCHAR(100) NOT NULL DEFAULT '');
            CREATE TABLE IF NOT EXISTS "Environments" ("Id" SERIAL PRIMARY KEY, "Name" VARCHAR(100) NOT NULL DEFAULT '');
            """);

        // 1. Fresh database: applies all scripts and stores checksums.
        MigrationRunner.Run(cs);
        var stored = await ScalarAsync("SELECT COUNT(*) FROM schema_checksums");
        Assert.True(stored > 0);

        // 2. Re-run: stored checksums exist and all match; nothing changes.
        MigrationRunner.Run(cs);
        Assert.Equal(stored, await ScalarAsync("SELECT COUNT(*) FROM schema_checksums"));

        // 3. A previously applied script that no longer exists only warns.
        await ExecAsync("INSERT INTO schema_checksums (script_name, checksum) VALUES ('9999_Removed.sql', 'abc')");
        MigrationRunner.Run(cs);

        // 4. A tampered checksum is rejected.
        await ExecAsync("UPDATE schema_checksums SET checksum = 'deadbeef' WHERE script_name <> '9999_Removed.sql'");
        var ex = Assert.Throws<InvalidOperationException>(() => MigrationRunner.Run(cs));
        Assert.Contains("checksum validation failed", ex.Message);
    }

    [Fact]
    public void Run_MissingForeignTables_RetriesThenFails()
    {
        // Without the Projects/Services tables owned by other services, the script fails with 42P01,
        // which MigrationRunner treats as transient: it retries and finally throws.
        var ex = Assert.Throws<Exception>(() => MigrationRunner.Run(_db.GetConnectionString()));
        Assert.Contains("Database migration failed", ex.Message);
    }

    [Fact]
    public void Run_InvalidConnection_Throws()
    {
        Assert.ThrowsAny<Exception>(() =>
            MigrationRunner.Run("Host=127.0.0.1;Port=1;Database=x;Username=x;Password=x;Timeout=1"));
    }
}
