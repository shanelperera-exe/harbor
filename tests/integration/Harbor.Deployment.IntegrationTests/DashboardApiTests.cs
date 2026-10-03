using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Deployment.DTOs;
using Xunit;

namespace Harbor.Deployment.IntegrationTests;

public class DashboardApiTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;

    public DashboardApiTests(DeploymentApiFactory factory) => _factory = factory;

    private HttpClient CreateClient(int userId, string role = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
        return client;
    }

    [Fact]
    public async Task GetDashboard_NoAuth_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var deployDashboardResponse = await client.GetAsync("/api/deployments/dashboard");
        Assert.Equal(HttpStatusCode.Unauthorized, deployDashboardResponse.StatusCode);
    }

    [Fact]
    public async Task GetDashboard_RegularUser_ReturnsAccessibleProjectsAndDeployments()
    {
        var client = CreateClient(DeploymentApiFactory.SeedOwnerId);

        // Create a deployment for this user's project
        var deployReq = new CreateDeploymentRequest
        {
            ServiceId = DeploymentApiFactory.SeedServiceId.ToString(),
            Environment = "production",
            Version = "1.0.0",
            CommitSha = "c0ffee123"
        };
        var createRes = await client.PostAsJsonAsync("/api/deployments", deployReq);
        createRes.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();
        Assert.NotNull(dashboard);
        Assert.Contains(dashboard.Projects, p => p.Id == DeploymentApiFactory.SeedProjectId);
        Assert.DoesNotContain(dashboard.Projects, p => p.Id == DeploymentApiFactory.SeedProjectId + 1);

        Assert.NotEmpty(dashboard.RecentDeployments);
        Assert.All(dashboard.RecentDeployments, d => Assert.Equal(DeploymentApiFactory.SeedProjectId, d.ProjectId));

        Assert.True(dashboard.Metrics.TotalProjects >= 1);
        Assert.True(dashboard.Metrics.TotalDeployments >= 1);
    }

    [Fact]
    public async Task GetDashboard_AdminUser_CanSeeAllProjects()
    {
        var adminClient = CreateClient(9999, role: "Admin");

        var response = await adminClient.GetAsync("/api/deployments/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();
        Assert.NotNull(dashboard);
        Assert.Contains(dashboard.Projects, p => p.Id == DeploymentApiFactory.SeedProjectId);
        Assert.Contains(dashboard.Projects, p => p.Id == DeploymentApiFactory.SeedProjectId + 1);
        Assert.True(dashboard.Metrics.TotalProjects >= 2);
    }
}
