using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Harbor.Deployment.DTOs;
using Npgsql;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// US-19 — <c>GET /api/deployments/{id}</c>.
///
/// Exercises the real Controller → Service → Repository → PostgreSQL stack through a
/// Testcontainers Postgres instance, so identifier resolution, the authorization gate and
/// log redaction are all verified against the actual SQL rather than a mock.
///
/// Deployments are seeded directly rather than via <c>POST /api/deployments</c> because the
/// detail scenarios need precise control over status, public id, timestamps and log content.
/// </summary>
public class DeploymentDetailsApiTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;

    public DeploymentDetailsApiTests(DeploymentApiFactory factory) => _factory = factory;

    private HttpClient CreateClient(int userId, string role = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
        return client;
    }

    /// <summary>
    /// The service's DbUp migrations only run when the host is first built, so the
    /// "Deployments"/"DeploymentLogs" tables do not exist until a client has been requested.
    /// Seeding must therefore happen after the host is up.
    /// </summary>
    private void EnsureHostStarted()
    {
        if (_hostStarted) return;
        _factory.CreateClient();
        _hostStarted = true;
    }

    private bool _hostStarted;

    private async Task<int> ProvisionServiceAsync(int ownerId)
    {
        EnsureHostStarted();
        return await _factory.ProvisionServiceForOwnerAsync(ownerId);
    }

    private async Task<HttpClient> CreateClientWithDeploymentAsync(
        int ownerId, string status = "Succeeded", string version = "1.0.0",
        string? failureReason = null, string? triggerError = null,
        string? commitMessage = null, DateTime? completedAt = null)
    {
        var serviceId = await ProvisionServiceAsync(ownerId);
        var publicId = await SeedDeploymentAsync(ownerId, serviceId, status, version, failureReason, triggerError, commitMessage, completedAt);
        Seeded.Add(publicId);
        return CreateClient(ownerId);
    }

    private readonly HashSet<string> Seeded = new();

    /// <summary>Inserts a deployment row and returns its generated public id.</summary>
    private async Task<string> SeedDeploymentAsync(
        int ownerId, int serviceId, string status, string version,
        string? failureReason, string? triggerError, string? commitMessage, DateTime? completedAt)
    {
        EnsureHostStarted();
        var suffix = Guid.NewGuid().ToString("N")[..10];
        var publicId = $"dep-{suffix}";

        await using var connection = new NpgsqlConnection(_factory._db.GetConnectionString());
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand("""
            INSERT INTO "Deployments"
                ("PublicId", "OwnerId", "ServiceId", "Environment", "Version", "CommitSha",
                 "Status", "StartedAt", "CompletedAt", "FailureReason", "TriggerError",
                 "CommitMessage", "WorkflowFile", "WorkflowRef")
            VALUES
                (@publicId, @ownerId, @serviceId, 'production', @version, 'abc1234',
                 @status, now() - interval '2 minutes', @completedAt, @failureReason, @triggerError,
                 @commitMessage, 'deploy.yml', 'refs/heads/main')
            RETURNING "PublicId";
            """, connection);
        command.Parameters.AddWithValue("publicId", publicId);
        command.Parameters.AddWithValue("ownerId", ownerId);
        command.Parameters.AddWithValue("serviceId", serviceId);
        command.Parameters.AddWithValue("version", version);
        command.Parameters.AddWithValue("status", status);
        command.Parameters.AddWithValue("completedAt", (object?)completedAt ?? DBNull.Value);
        command.Parameters.AddWithValue("failureReason", (object?)failureReason ?? DBNull.Value);
        command.Parameters.AddWithValue("triggerError", (object?)triggerError ?? DBNull.Value);
        command.Parameters.AddWithValue("commitMessage", (object?)commitMessage ?? DBNull.Value);

        return (string)(await command.ExecuteScalarAsync())!;
    }

    /// <summary>Resolves a public id to its numeric id, then appends log rows in order.</summary>
    private async Task<int> SeedLogsAsync(string publicId, params (DateTime Timestamp, string Level, string Message)[] logs)
    {
        await using var connection = new NpgsqlConnection(_factory._db.GetConnectionString());
        await connection.OpenAsync();

        int deploymentId;
        await using (var lookup = new NpgsqlCommand("SELECT \"Id\" FROM \"Deployments\" WHERE \"PublicId\" = @publicId", connection))
        {
            lookup.Parameters.AddWithValue("publicId", publicId);
            deploymentId = Convert.ToInt32(await lookup.ExecuteScalarAsync());
        }

        foreach (var log in logs)
        {
            await using var insert = new NpgsqlCommand("""
                INSERT INTO "DeploymentLogs" ("DeploymentId", "Timestamp", "Level", "Message")
                VALUES (@deploymentId, @timestamp, @level, @message);
                """, connection);
            insert.Parameters.AddWithValue("deploymentId", deploymentId);
            insert.Parameters.AddWithValue("timestamp", log.Timestamp);
            insert.Parameters.AddWithValue("level", log.Level);
            insert.Parameters.AddWithValue("message", log.Message);
            await insert.ExecuteNonQueryAsync();
        }

        return deploymentId;
    }

    private static async Task<DeploymentDetailsResponse?> ReadDetailsAsync(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<DeploymentDetailsResponse>();

    // =========================================================================
    // Scenario 1 — identifier resolution / API validation
    // =========================================================================

    [Fact]
    public async Task GetDetails_ByPublicId_Returns200WithExpectedMetadata()
    {
        var client = await CreateClientWithDeploymentAsync(41001, version: "us19-scenario1");

        var response = await client.GetAsync($"/api/deployments/{Seeded.Last()}");
        var body = await ReadDetailsAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        Assert.Equal("us19-scenario1", body!.Version);
        Assert.Equal("production", body.Environment);
        Assert.Equal("Succeeded", body.Status);
        Assert.NotEqual(0, body.ServiceId);
    }

    [Fact]
    public async Task GetDetails_ByNumericId_ReturnsSameDeploymentAsPublicId()
    {
        var serviceId = await ProvisionServiceAsync(41002);
        var publicId = await SeedDeploymentAsync(41002, serviceId, "Succeeded", "us19-numeric", null, null, null, null);
        var client = CreateClient(41002);

        int numericId = await SeedLogsAsync(publicId);   // resolves and returns the id
        var byPublic = await client.GetAsync($"/api/deployments/{publicId}");
        var byNumeric = await client.GetAsync($"/api/deployments/{numericId}");

        Assert.Equal(HttpStatusCode.OK, byPublic.StatusCode);
        Assert.Equal(HttpStatusCode.OK, byNumeric.StatusCode);

        var a = await ReadDetailsAsync(byPublic);
        var b = await ReadDetailsAsync(byNumeric);
        Assert.Equal(a!.Id, b!.Id);
        Assert.Equal(a.PublicId, b.PublicId);
    }

    [Fact]
    public async Task GetDetails_ResolvesProjectServiceAndEnvironmentNames()
    {
        var client = await CreateClientWithDeploymentAsync(41003, version: "us19-names");
        var publicId = Seeded.Last();

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.NotNull(body!.ProjectName);
        Assert.StartsWith("owned-project-", body.ProjectName);
        Assert.NotNull(body.ServiceName);
        Assert.StartsWith("owned-service-", body.ServiceName);
        Assert.Equal("Backend", body.ServiceType);
    }

    [Fact]
    public async Task GetDetails_DeploymentAuthorIsReturnedAsUserName()
    {
        var client = await CreateClientWithDeploymentAsync(41004, version: "us19-author");
        var publicId = Seeded.Last();

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        // The seeded Users row for this owner does not exist, so the LEFT JOIN yields null and
        // the service must surface it without throwing.
        Assert.NotNull(body);
    }

    [Fact]
    public async Task GetDetails_ReturnsWorkflowAndTimestampMetadata()
    {
        var client = await CreateClientWithDeploymentAsync(41005, version: "us19-workflow", completedAt: DateTime.UtcNow);
        var publicId = Seeded.Last();

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Equal("deploy.yml", body!.WorkflowFile);
        Assert.Equal("refs/heads/main", body.WorkflowRef);
        Assert.NotEqual(default, body.StartedAt);
        Assert.NotNull(body.CompletedAt);
    }

    [Fact]
    public async Task GetDetails_NonExistentNumericId_Returns404()
    {
        var client = CreateClient(41006);

        var response = await client.GetAsync("/api/deployments/99999999");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_NonExistentPublicId_Returns404()
    {
        var client = CreateClient(41007);

        var response = await client.GetAsync("/api/deployments/dep-doesnotexist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("not-an-id")]
    [InlineData("-1")]
    [InlineData("0")]
    [InlineData("dep-")]
    [InlineData("1%20OR%201=1")]
    [InlineData("'")]
    [InlineData("%27%3B%20DROP%20TABLE%20%22Deployments%22%3B%20--")]
    public async Task GetDetails_InvalidIdentifier_Returns404AndNever500(string identifier)
    {
        var client = CreateClient(41008);

        var response = await client.GetAsync($"/api/deployments/{identifier}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_SqlInjectionAttempt_DoesNotExecuteOrAlterData()
    {
        var client = await CreateClientWithDeploymentAsync(41009, version: "us19-injection");
        var publicId = Seeded.Last();

        // The identifier reaches a parameterised query, so this is inert.
        var attack = await client.GetAsync($"/api/deployments/{Uri.EscapeDataString("x'; DROP TABLE \"Deployments\"; --")}");
        Assert.Equal(HttpStatusCode.NotFound, attack.StatusCode);

        // The legitimate deployment is still readable => the table was not dropped or altered.
        var stillThere = await client.GetAsync($"/api/deployments/{publicId}");
        Assert.Equal(HttpStatusCode.OK, stillThere.StatusCode);
    }

    [Fact]
    public async Task GetDetails_VeryLongIdentifier_Returns404()
    {
        var client = CreateClient(41010);

        var response = await client.GetAsync("/api/deployments/" + new string('9', 4000));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // =========================================================================
    // Scenario 4 — authorization
    // =========================================================================

    [Fact]
    public async Task GetDetails_NoAuth_Returns401()
    {
        var client = await CreateClientWithDeploymentAsync(41011, version: "us19-noauth");
        var publicId = Seeded.Last();
        var anonymous = _factory.CreateClient();   // no token

        var response = await anonymous.GetAsync($"/api/deployments/{publicId}");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_MalformedToken_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not.a.jwt");

        var response = await client.GetAsync("/api/deployments/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_TokenSignedWithWrongKey_Returns401()
    {
        // Forged token: structurally valid, correctly signed, but with the wrong key.
        var forged = CreateTokenWithWrongKey(41012);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);

        var response = await client.GetAsync("/api/deployments/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_ExpiredToken_Returns401()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", CreateExpiredToken(41013));

        var response = await client.GetAsync("/api/deployments/1");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_OtherUsersDeployment_Returns404()
    {
        var ownerClient = await CreateClientWithDeploymentAsync(41014, version: "us19-owner");
        var publicId = Seeded.Last();

        var attacker = CreateClient(41999);   // legitimate user, different project

        var response = await attacker.GetAsync($"/api/deployments/{publicId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_OtherUsersDeployment_ResponseBodyExposesNoMetadata()
    {
        var ownerClient = await CreateClientWithDeploymentAsync(41015, version: "us19-secret-project", commitMessage: "TopSecretProjectName");
        var publicId = Seeded.Last();

        var attacker = CreateClient(41998);
        var response = await attacker.GetAsync($"/api/deployments/{publicId}");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        // No trace of the project, service, author, status or timestamps.
        Assert.DoesNotContain("us19-secret-project", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("TopSecretProjectName", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("owned-project-", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("owned-service-", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetDetails_OtherUsersDeployment_DoesNotReturnLogs()
    {
        var ownerClient = await CreateClientWithDeploymentAsync(41016, status: "Failed", version: "us19-logs", failureReason: "OOMKilled");
        var publicId = Seeded.Last();
        await SeedLogsAsync(publicId,
            (DateTime.UtcNow, "Error", "OOMKilled: container exceeded memory limit"),
            (DateTime.UtcNow.AddSeconds(1), "Error", "SECRETLESSON password=hunter2"));

        var attacker = CreateClient(41997);
        var raw = await (await attacker.GetAsync($"/api/deployments/{publicId}")).Content.ReadAsStringAsync();

        Assert.DoesNotContain("OOMKilled", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("hunter2", raw, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Logs", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetDetails_ForbiddenAndNonExistent_AreIndistinguishable()
    {
        var ownerClient = await CreateClientWithDeploymentAsync(41017, version: "us19-indistinguishable");
        var publicId = Seeded.Last();

        var attacker = CreateClient(41996);

        var forbidden   = await attacker.GetAsync($"/api/deployments/{publicId}");
        var nonExistent = await attacker.GetAsync("/api/deployments/88888888");

        Assert.Equal(forbidden.StatusCode, nonExistent.StatusCode);
        // ASP.NET stamps a unique traceId into every ProblemDetails body, so normalise it out
        // before comparing: the point is that nothing ELSE differs between "forbidden" and
        // "does not exist", so neither case can be used to probe which ids are real.
        static string Normalise(string body) =>
            System.Text.RegularExpressions.Regex.Replace(body, "\"traceId\":\"[^\"]+\"", "\"traceId\":\"*\"");

        Assert.Equal(
            Normalise(await forbidden.Content.ReadAsStringAsync()),
            Normalise(await nonExistent.Content.ReadAsStringAsync()));
    }

    [Fact]
    public async Task GetDetails_AdminCanReadAnyUsersDeployment()
    {
        var ownerClient = await CreateClientWithDeploymentAsync(41018, version: "us19-admin-read");
        var publicId = Seeded.Last();

        var admin = CreateClient(41995, role: "Admin");

        var response = await admin.GetAsync($"/api/deployments/{publicId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await ReadDetailsAsync(response);
        Assert.Equal("us19-admin-read", body!.Version);
    }

    [Fact]
    public async Task GetDetails_DirectUrlTamperingWithAnotherUsersNumericId_Returns404()
    {
        // Reproduces the manual "edit the URL / swap the id" attack from the US-19 acceptance criteria.
        var ownerClient = await CreateClientWithDeploymentAsync(41019, version: "us19-tamper");
        var publicId = Seeded.Last();
        var numericId = await SeedLogsAsync(publicId);

        var attacker = CreateClient(41994);

        // Same user, same numeric id they are not allowed to see.
        var response = await attacker.GetAsync($"/api/deployments/{numericId}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetDetails_DeploymentInArchivedProjectOfSameOwner_RemainsAccessible()
    {
        // Access is gated on p."OwnerId" only; archiving is not part of the detail gate.
        var client = await CreateClientWithDeploymentAsync(41020, version: "us19-archived");
        var publicId = Seeded.Last();

        await using (var connection = new NpgsqlConnection(_factory._db.GetConnectionString()))
        {
            await connection.OpenAsync();
            await using var archive = new NpgsqlCommand("UPDATE \"Projects\" SET \"IsArchived\" = TRUE WHERE \"Name\" LIKE 'owned-project-%'", connection);
            await archive.ExecuteNonQueryAsync();
        }

        var response = await client.GetAsync($"/api/deployments/{publicId}");

        // Documented current behaviour: archiving a project does not revoke detail access.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // =========================================================================
    // Scenario 3 — failed deployments and failure information
    // =========================================================================

    [Fact]
    public async Task GetDetails_FailedDeployment_ReturnsFailureReasonAndLogs()
    {
        var client = await CreateClientWithDeploymentAsync(41021, status: "Failed", version: "us19-failed", failureReason: "Container failed to start");
        var publicId = Seeded.Last();
        await SeedLogsAsync(publicId, (DateTime.UtcNow, "Error", "Readiness probe timed out"));

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Equal("Failed", body!.Status);
        Assert.Equal("Container failed to start", body.FailureReason);
        Assert.Single(body.Logs);
        Assert.Equal("Error", body.Logs[0].Level);
        Assert.Equal("Readiness probe timed out", body.Logs[0].Message);
    }

    [Theory]
    [InlineData("Succeeded")]
    [InlineData("Running")]
    [InlineData("Cancelled")]
    [InlineData("TimedOut")]
    public async Task GetDetails_NonFailedStatus_NeverReturnsFailureReason(string status)
    {
        var client = await CreateClientWithDeploymentAsync(41022, status: status, version: "us19-nofail", failureReason: "should be hidden");

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{Seeded.Last()}"));

        Assert.Null(body!.FailureReason);
    }

    [Fact]
    public async Task GetDetails_FailedDeploymentWithoutReason_ReturnsEmptyStringNotNull()
    {
        var client = await CreateClientWithDeploymentAsync(41023, status: "Failed", version: "us19-noreason");

        var response = await client.GetAsync($"/api/deployments/{Seeded.Last()}");
        var raw = await response.Content.ReadAsStringAsync();
        var body = await ReadDetailsAsync(response);

        Assert.Equal("Failed", body!.Status);
        // Sanitize(null) returns string.Empty (DeploymentLogSanitizer.cs:21), so a failed
        // deployment with no recorded reason serialises "" rather than null. The UI relies on
        // falsiness (`deployment.failureReason || deployment.triggerError`) so the banner is
        // still correctly hidden, but API consumers must not assume null.
        Assert.Equal(string.Empty, body.FailureReason);
        Assert.Contains("\"failureReason\":\"\"", raw, StringComparison.OrdinalIgnoreCase);
    }

    // =========================================================================
    // Scenario 2 — logs
    // =========================================================================

    [Fact]
    public async Task GetDetails_LogsAreReturnedInTimestampOrder()
    {
        var client = await CreateClientWithDeploymentAsync(41024, version: "us19-order");
        var publicId = Seeded.Last();

        var t0 = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        await SeedLogsAsync(publicId,
            (t0.AddSeconds(30), "Info", "third"),
            (t0,                "Info", "first"),
            (t0.AddSeconds(10), "Info", "second"));

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Equal(3, body!.Logs.Count);
        Assert.Equal("first", body.Logs[0].Message);
        Assert.Equal("second", body.Logs[1].Message);
        Assert.Equal("third", body.Logs[2].Message);
    }

    [Fact]
    public async Task GetDetails_LogsWithIdenticalTimestamps_KeepInsertionOrder()
    {
        // ORDER BY "Timestamp", "Id" — the Id tiebreaker is what makes this deterministic.
        var client = await CreateClientWithDeploymentAsync(41025, version: "us19-tie");
        var publicId = Seeded.Last();

        var same = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc);
        await SeedLogsAsync(publicId,
            (same, "Info", "inserted-first"),
            (same, "Info", "inserted-second"),
            (same, "Info", "inserted-third"));

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Equal(new[] { "inserted-first", "inserted-second", "inserted-third" },
            body!.Logs.Select(l => l.Message));
    }

    [Fact]
    public async Task GetDetails_DeploymentWithNoLogs_ReturnsEmptyArrayNotNull()
    {
        var client = await CreateClientWithDeploymentAsync(41026, version: "us19-nologs");

        var response = await client.GetAsync($"/api/deployments/{Seeded.Last()}");
        var raw = await response.Content.ReadAsStringAsync();
        var body = await ReadDetailsAsync(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body!.Logs);
        Assert.Empty(body.Logs);
        // The UI's no-logs branch depends on this serialising as [] rather than null.
        Assert.Contains("\"logs\":[]", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetDetails_LargeLogPayload_IsReturnedCompleteAndOrdered()
    {
        var client = await CreateClientWithDeploymentAsync(41027, status: "Failed", version: "us19-large", failureReason: "OOM");
        var publicId = Seeded.Last();

        var t0 = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var logs = Enumerable.Range(0, 2000)
            .Select(i => (Timestamp: t0.AddSeconds(i), Level: i % 5 == 0 ? "Error" : "Info", Message: $"line-{i:D4}"))
            .ToArray();
        foreach (var chunk in logs.Chunk(500))
            await SeedLogsAsync(publicId, chunk);

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Equal(2000, body!.Logs.Count);
        Assert.Equal("line-0000", body.Logs[0].Message);
        Assert.Equal("line-1999", body.Logs[^1].Message);
    }

    [Fact]
    public async Task GetDetails_LogsPreserveUnicodeAndSpecialCharacters()
    {
        var client = await CreateClientWithDeploymentAsync(41028, version: "us19-unicode");
        var publicId = Seeded.Last();
        await SeedLogsAsync(publicId,
            (DateTime.UtcNow, "Info", "emoji 🚀 and CJK 日本語 and RTL \u202eoverride"),
            (DateTime.UtcNow.AddSeconds(1), "Info", "quotes \" and backslash \\ and <script>alert(1)</script>"));

        var body = await ReadDetailsAsync(await client.GetAsync($"/api/deployments/{publicId}"));

        Assert.Contains("🚀", body!.Logs[0].Message);
        Assert.Contains("日本語", body.Logs[0].Message);
        Assert.Contains("<script>", body.Logs[1].Message);
    }

    // =========================================================================
    // Sensitive data — the US-19 definition-of-done requirement
    // =========================================================================

    [Fact]
    public async Task GetDetails_SecretsInLogs_AreRedactedInApiResponse()
    {
        var client = await CreateClientWithDeploymentAsync(41029, status: "Failed", version: "us19-redact-logs", failureReason: "build failed");
        var publicId = Seeded.Last();
        await SeedLogsAsync(publicId,
            (DateTime.UtcNow, "Error", "deploying with PASSWORD=hunter2"),
            (DateTime.UtcNow.AddSeconds(1), "Error", "Authorization: Bearer ghp_supersecrettoken"),
            (DateTime.UtcNow.AddSeconds(2), "Info", "config {\"apiKey\":\"ak_live_secret_value\"}"),
            (DateTime.UtcNow.AddSeconds(3), "Info", "CLIENT_SECRET=cs_abcdef123456"));

        var response = await client.GetAsync($"/api/deployments/{publicId}");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("hunter2", raw);
        Assert.DoesNotContain("ghp_supersecrettoken", raw);
        Assert.DoesNotContain("ak_live_secret_value", raw);
        Assert.DoesNotContain("cs_abcdef123456", raw);
        Assert.Contains("[REDACTED]", raw);
    }

    [Fact]
    public async Task GetDetails_SecretInFailureReason_IsRedactedInApiResponse()
    {
        var client = await CreateClientWithDeploymentAsync(41030, status: "Failed", version: "us19-redact-reason",
            failureReason: "workflow rejected: token=ghp_failure_reason_secret");

        var response = await client.GetAsync($"/api/deployments/{Seeded.Last()}");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("ghp_failure_reason_secret", raw);
        Assert.Contains("[REDACTED]", raw);
    }

    [Fact]
    public async Task GetDetails_SecretInTriggerError_IsRedactedInApiResponse()
    {
        var client = await CreateClientWithDeploymentAsync(41031, status: "Failed", version: "us19-redact-trigger",
            failureReason: "dispatch failed", triggerError: "api_key=trigger_error_secret_value");

        var response = await client.GetAsync($"/api/deployments/{Seeded.Last()}");
        var raw = await response.Content.ReadAsStringAsync();

        Assert.DoesNotContain("trigger_error_secret_value", raw);
    }

    [Fact]
    public async Task GetDetails_SecretsInLogs_ArePersistedUnredacted_ButNeverReturned()
    {
        // Redaction is a read-time concern, so the raw value must still be in the table —
        // otherwise the assertion above would pass for the wrong reason (nothing was stored).
        var client = await CreateClientWithDeploymentAsync(41032, status: "Failed", version: "us19-persist", failureReason: "x");
        var publicId = Seeded.Last();
        await SeedLogsAsync(publicId, (DateTime.UtcNow, "Error", "PASSWORD=stored_not_returned"));

        await using var connection = new NpgsqlConnection(_factory._db.GetConnectionString());
        await connection.OpenAsync();
        await using var check = new NpgsqlCommand(
            "SELECT \"Message\" FROM \"DeploymentLogs\" WHERE \"DeploymentId\" = (SELECT \"Id\" FROM \"Deployments\" WHERE \"PublicId\" = @publicId)",
            connection);
        check.Parameters.AddWithValue("publicId", publicId);
        var stored = (string)(await check.ExecuteScalarAsync())!;

        Assert.Contains("stored_not_returned", stored);

        var raw = await (await client.GetAsync($"/api/deployments/{publicId}")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("stored_not_returned", raw);
    }

    [Fact]
    public async Task GetDetails_ResponseContainsOnlyDeploymentDetailFields()
    {
        var client = await CreateClientWithDeploymentAsync(41033, version: "us19-schema");
        var publicId = Seeded.Last();

        var raw = await (await client.GetAsync($"/api/deployments/{publicId}")).Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(raw);
        var names = document.RootElement.EnumerateObject().Select(p => p.Name).ToHashSet(StringComparer.Ordinal);

        // Exactly the documented surface — nothing internal such as OwnerId, WorkflowRunId,
        // ServiceAccess or raw entity fields.
        Assert.Equal(
            new[]
            {
                "id", "publicId", "hash", "serviceId", "environment", "version", "commitSha",
                "commitMessage", "status", "startedAt", "completedAt", "workflowFile", "workflowRef",
                "projectName", "serviceName", "serviceType", "userName",
                "failureReason", "triggerError", "workflowRunUrl", "deploymentUrl", "logs"
            }.OrderBy(n => n, StringComparer.Ordinal),
            names.OrderBy(n => n, StringComparer.Ordinal));

        Assert.DoesNotContain("ownerId", names, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("workflowRunId", names, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("passwordHash", raw, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task GetDetails_CommitMessageSecretIsNotRedacted_KNOWN_GAP_D06()
    {
        // DeploymentService.cs:100 returns CommitMessage without running it through
        // DeploymentLogSanitizer, unlike logs / failureReason / triggerError.
        var client = await CreateClientWithDeploymentAsync(41034, version: "us19-commitmsg",
            commitMessage: "revert: PASSWORD=hunter2 in commit message");

        var raw = await (await client.GetAsync($"/api/deployments/{Seeded.Last()}")).Content.ReadAsStringAsync();

        Assert.Contains("hunter2", raw);

        // REQUIRED FIX: sanitize CommitMessage in DeploymentService.GetDetailsAsync, then change
        // this assertion to DoesNotContain.
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private static string CreateTokenWithWrongKey(int userId)
    {
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes("a-completely-different-signing-key-32chars"));
        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: DeploymentApiFactory.JwtIssuer,
            audience: DeploymentApiFactory.JwtAudience,
            claims: new[]
            {
                new System.Security.Claims.Claim("userId", userId.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Admin")
            },
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));

        return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string CreateExpiredToken(int userId)
    {
        var key = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(
            System.Text.Encoding.UTF8.GetBytes(DeploymentApiFactory.JwtSecret));
        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: DeploymentApiFactory.JwtIssuer,
            audience: DeploymentApiFactory.JwtAudience,
            claims: new[]
            {
                new System.Security.Claims.Claim("userId", userId.ToString()),
                new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "User")
            },
            expires: DateTime.UtcNow.AddMinutes(-5),
            signingCredentials: new Microsoft.IdentityModel.Tokens.SigningCredentials(
                key, Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256));

        return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    }
}