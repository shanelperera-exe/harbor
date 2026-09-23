using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Deployment.DTOs;
using Npgsql;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// Integration tests for the deployment rollback (Re-deploy) feature.
/// Exercises POST /api/deployments/{id}/redeploy through the full stack.
/// </summary>
public class RedeployApiTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;

    public RedeployApiTests(DeploymentApiFactory factory) => _factory = factory;

    private HttpClient CreateClient(int userId, string role = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
        return client;
    }

    private static int SeedOwner => DeploymentApiFactory.SeedOwnerId;
    private static int SeedSvc => DeploymentApiFactory.SeedServiceId;

    private async Task<int> SetDeploymentStatusAsync(int deploymentId, string status)
    {
        await using var connection = new NpgsqlConnection(_factory._db.GetConnectionString());
        await connection.OpenAsync();
        await using var cmd = connection.CreateCommand();
        cmd.CommandText = @"UPDATE ""Deployments"" SET ""Status"" = @status WHERE ""Id"" = @id";
        cmd.Parameters.AddWithValue("status", status);
        cmd.Parameters.AddWithValue("id", deploymentId);
        await cmd.ExecuteNonQueryAsync();
        return deploymentId;
    }

    private async Task<CreateDeploymentResponse> CreateSucceededDeploymentAsync(HttpClient client, int userId, int serviceId, string env = "production", string version = "1.0.0")
    {
        var response = await client.PostAsJsonAsync("/api/deployments", new CreateDeploymentRequest
        {
            ServiceId = serviceId.ToString(),
            Environment = env,
            Version = version,
            CommitSha = "abc123456789",
            Branch = "main"
        });
        response.EnsureSuccessStatusCode();
        var body = (await response.Content.ReadFromJsonAsync<CreateDeploymentResponse>())!;

        // Promote to Succeeded directly in DB (simulating webhook completion)
        await SetDeploymentStatusAsync(body.Id, "Succeeded");
        return body;
    }

    // ─── Tests ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Redeploy_SucceededDeployment_Returns201()
    {
        var ownerClient = CreateClient(SeedOwner);
        var original = await CreateSucceededDeploymentAsync(ownerClient, SeedOwner, SeedSvc);

        var response = await ownerClient.PostAsync($"/api/deployments/{original.Id}/redeploy", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CreateDeploymentResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Id > 0);
        Assert.NotEqual(original.Id, body!.Id);
        Assert.Equal("Running", body!.Status);
    }

    [Fact]
    public async Task Redeploy_NoAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsync("/api/deployments/1/redeploy", null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Redeploy_PendingDeployment_Returns404()
    {
        var ownerClient = CreateClient(SeedOwner);
        var dep = await CreateSucceededDeploymentAsync(ownerClient, SeedOwner, SeedSvc);
        // Reset to Pending — not eligible for redeploy
        await SetDeploymentStatusAsync(dep.Id, "Pending");

        var response = await ownerClient.PostAsync($"/api/deployments/{dep.Id}/redeploy", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Redeploy_RunningDeployment_Returns404()
    {
        var ownerClient = CreateClient(SeedOwner);
        var dep = await CreateSucceededDeploymentAsync(ownerClient, SeedOwner, SeedSvc);
        await SetDeploymentStatusAsync(dep.Id, "Running");

        var response = await ownerClient.PostAsync($"/api/deployments/{dep.Id}/redeploy", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Redeploy_NonExistentDeployment_Returns404()
    {
        var ownerClient = CreateClient(SeedOwner);

        var response = await ownerClient.PostAsync("/api/deployments/999999/redeploy", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Redeploy_OtherUsersDeployment_Returns404()
    {
        var otherOwner = DeploymentApiFactory.OtherOwnerId;
        var otherClient = CreateClient(otherOwner, "Admin");
        var original = await CreateSucceededDeploymentAsync(otherClient, otherOwner, DeploymentApiFactory.OtherServiceId, "production", "1.0.0");

        // SeedOwner tries to redeploy OtherOwner's deployment
        var ownerClient = CreateClient(SeedOwner);
        var response = await ownerClient.PostAsync($"/api/deployments/{original.Id}/redeploy", null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Redeploy_CreatesNewRecordWithSameParams()
    {
        var ownerClient = CreateClient(SeedOwner);
        var original = await CreateSucceededDeploymentAsync(ownerClient, SeedOwner, SeedSvc, "staging", "v2.0.0");

        var response = await ownerClient.PostAsync($"/api/deployments/{original.Id}/redeploy", null);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Fetch the new deployment's details from history
        var history = await ownerClient.GetAsync("/api/deployments");
        var body = await history.Content.ReadFromJsonAsync<DeploymentListResponse>();

        // Find the redeployed entry
        var redeployed = body!.Items.FirstOrDefault(d => d.PublicId != original.PublicId && d.Version == "v2.0.0" && d.Environment == "staging");
        Assert.NotNull(redeployed);
        Assert.Equal("abc123456789", redeployed!.CommitSha);
    }

    [Fact]
    public async Task Redeploy_AcAdminCanRedeployOtherUsersDeployment()
    {
        var otherOwner = DeploymentApiFactory.OtherOwnerId;
        var otherClient = CreateClient(otherOwner, "Admin");
        var original = await CreateSucceededDeploymentAsync(otherClient, otherOwner, DeploymentApiFactory.OtherServiceId, "production", "1.0.0");

        // Admin user should be able to redeploy across services
        var adminClient = CreateClient(SeedOwner, "Admin");
        var response = await adminClient.PostAsync($"/api/deployments/{original.Id}/redeploy", null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CreateDeploymentResponse>();
        Assert.NotNull(body);
        Assert.True(body!.Id > 0);
    }
}
