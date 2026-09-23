using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Deployment.DTOs;
using Npgsql;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// End-to-end integration tests for CI run tracking.
/// These exercise the GET /api/deployments/ci-runs endpoint through the
/// full Controller → Service → Repository → real DB stack.
/// </summary>
public class CiRunApiTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;

    public CiRunApiTests(DeploymentApiFactory factory) => _factory = factory;

    private HttpClient CreateClient(int userId, string role = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
        return client;
    }

    private static int SeedOwner => DeploymentApiFactory.SeedOwnerId;
    private static int OtherOwner => DeploymentApiFactory.OtherOwnerId;
    private static int SeedSvc => DeploymentApiFactory.SeedServiceId;

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<int> SeedCiRunAsync(HttpClient client, int userId, int serviceId,
        long githubRunId, string workflowName, string status, string? conclusion, string branch, string? commitSha)
    {
        await using var connection = new NpgsqlConnection(_factory._db.GetConnectionString());
        await connection.OpenAsync();

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO ""CiRuns"" (""ServiceId"", ""OwnerId"", ""WorkflowName"", ""WorkflowFile"",
                ""Branch"", ""CommitSha"", ""Conclusion"", ""Status"", ""GitHubRunId"", ""GitHubRunUrl"",
                ""StartedAt"", ""CompletedAt"")
            VALUES (@serviceId, @ownerId, @workflowName, @workflowFile, @branch, @commitSha,
                @conclusion, @status, @githubRunId, @githubRunUrl, @startedAt, @completedAt)
            RETURNING ""Id"";";
        cmd.Parameters.AddWithValue("serviceId", serviceId);
        cmd.Parameters.AddWithValue("ownerId", userId);
        cmd.Parameters.AddWithValue("workflowName", workflowName);
        cmd.Parameters.AddWithValue("workflowFile", "ci.yml");
        cmd.Parameters.AddWithValue("branch", branch);
        cmd.Parameters.AddWithValue("commitSha", (object?)commitSha ?? DBNull.Value);
        cmd.Parameters.AddWithValue("conclusion", (object?)conclusion ?? DBNull.Value);
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("githubRunId", githubRunId);
        cmd.Parameters.AddWithValue("githubRunUrl", "https://github.com/test-owner/test-repo/actions/runs/" + githubRunId);
        cmd.Parameters.AddWithValue("startedAt", DateTime.UtcNow.AddMinutes(-30));
        cmd.Parameters.AddWithValue("completedAt", status == "completed" ? (object)DateTime.UtcNow.AddMinutes(-25) : DBNull.Value);
        return Convert.ToInt32(await cmd.ExecuteScalarAsync());
    }

    // ─── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCiRuns_NoAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/deployments/ci-runs?serviceId=20");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetCiRuns_EmptyList_Returns200()
    {
        var client = CreateClient(userId: 99910);

        var response = await client.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CiRunListResponse>();
        Assert.NotNull(body);
        Assert.Empty(body!.Items);
        Assert.Equal(0, body.TotalCount);
    }

    [Fact]
    public async Task GetCiRuns_ReturnsOnlyCallerCiRuns()
    {
        var ownerClient = CreateClient(SeedOwner);
        var otherClient = CreateClient(OtherOwner);

        await SeedCiRunAsync(ownerClient, SeedOwner, SeedSvc, 1001, "CI Pipeline", "completed", "success", "main", "abc123");

        var ownerResponse = await ownerClient.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}");
        var ownerBody = await ownerResponse.Content.ReadFromJsonAsync<CiRunListResponse>();
        Assert.Equal(HttpStatusCode.OK, ownerResponse.StatusCode);
        Assert.Single(ownerBody!.Items);

        var otherResponse = await otherClient.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}");
        var otherBody = await otherResponse.Content.ReadFromJsonAsync<CiRunListResponse>();
        Assert.Equal(HttpStatusCode.OK, otherResponse.StatusCode);
        Assert.Empty(otherBody!.Items);
    }

    [Fact]
    public async Task GetCiRuns_Pagination_ReturnsCorrectPage()
    {
        const int userId = 99911;
        var client = CreateClient(userId, "Admin");

        for (var i = 1; i <= 3; i++)
            await SeedCiRunAsync(client, userId, SeedSvc, 2000 + i, "CI", "completed", "success", "main", "abc123");

        var response = await client.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}&page=1&pageSize=2");
        var body = await response.Content.ReadFromJsonAsync<CiRunListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(2, body!.Items.Count);
        Assert.Equal(1, body.Page);
        Assert.Equal(2, body.PageSize);
        Assert.Equal(3, body.TotalCount);
    }

    [Fact]
    public async Task GetCiRuns_SortsNewestFirst()
    {
        const int userId = 99912;
        var client = CreateClient(userId, "Admin");

        var older = await SeedCiRunAsync(client, userId, SeedSvc, 3001, "CI-older", "completed", "success", "main", "abc123");
        await Task.Delay(100);
        var newer = await SeedCiRunAsync(client, userId, SeedSvc, 3002, "CI-newer", "completed", "success", "main", "abc123");

        var response = await client.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}&page=1&pageSize=10");
        var body = await response.Content.ReadFromJsonAsync<CiRunListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(body!.Items.Count >= 2);
        Assert.Equal(newer, body.Items[0].Id);
    }

    [Fact]
    public async Task GetCiRuns_InvalidService_ReturnsEmptyList()
    {
        var client = CreateClient(SeedOwner);

        var response = await client.GetAsync("/api/deployments/ci-runs?serviceId=99999");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CiRunListResponse>();
        Assert.NotNull(body);
        Assert.Empty(body!.Items);
    }

    [Fact]
    public async Task GetCiRuns_InProgressRun_ShownWithCorrectStatus()
    {
        const int userId = 99913;
        var client = CreateClient(userId, "Admin");
        await SeedCiRunAsync(client, userId, SeedSvc, 4001, "CI", "in_progress", conclusion: null, "main", "abc123");

        var response = await client.GetAsync($"/api/deployments/ci-runs?serviceId={SeedSvc}");
        var body = await response.Content.ReadFromJsonAsync<CiRunListResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(body);
        var running = body!.Items.FirstOrDefault(c => c.GitHubRunId == 4001);
        Assert.NotNull(running);
        Assert.Equal("in_progress", running!.Status);
        Assert.Null(running.Conclusion);
    }
}
