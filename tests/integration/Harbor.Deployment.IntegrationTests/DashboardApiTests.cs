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

    [Fact]
    public async Task GetDashboard_NewUser_ReturnsEmptyState()
    {
        // User with no projects/environments
        var newUserId = 999;
        var client = CreateClient(newUserId);

        var response = await client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();
        Assert.NotNull(dashboard);
        Assert.Empty(dashboard.Projects);
        Assert.Empty(dashboard.RecentDeployments);
        Assert.Equal(0, dashboard.Metrics.TotalProjects);
        Assert.Equal(0, dashboard.Metrics.TotalDeployments);
        Assert.Equal(0, dashboard.Metrics.SuccessfulDeployments);
        Assert.Equal(0, dashboard.Metrics.RunningDeployments);
        Assert.Equal(0, dashboard.Metrics.FailedDeployments);
    }

    [Fact]
    public async Task GetDashboard_ServiceNameAndEnvironmentNamePopulated()
    {
        var client = CreateClient(DeploymentApiFactory.SeedOwnerId);

        // Create a deployment
        var deployReq = new CreateDeploymentRequest
        {
            ServiceId = DeploymentApiFactory.SeedServiceId.ToString(),
            Environment = "production",
            Version = "3.0.0",
            CommitSha = "populate123"
        };
        var createRes = await client.PostAsJsonAsync("/api/deployments", deployReq);
        createRes.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();
        Assert.NotNull(dashboard);
        Assert.NotEmpty(dashboard.RecentDeployments);
        
        var deployment = dashboard.RecentDeployments.First();
        Assert.NotNull(deployment.ServiceName);
        Assert.NotNull(deployment.ProjectName);
        Assert.NotNull(deployment.Environment);
        Assert.NotEmpty(deployment.ServiceName);
        Assert.NotEmpty(deployment.ProjectName);
    }

    [Fact]
    public async Task GetDashboard_ProjectIncludesLatestDeploymentStatus()
    {
        var client = CreateClient(DeploymentApiFactory.SeedOwnerId);

        // Create a deployment
        var deployReq = new CreateDeploymentRequest
        {
            ServiceId = DeploymentApiFactory.SeedServiceId.ToString(),
            Environment = "production",
            Version = "2.0.0",
            CommitSha = "latest123"
        };
        var createRes = await client.PostAsJsonAsync("/api/deployments", deployReq);
        createRes.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/dashboard");
        response.EnsureSuccessStatusCode();

        var dashboard = await response.Content.ReadFromJsonAsync<DashboardSummaryResponse>();
        Assert.NotNull(dashboard);
        
        var project = dashboard.Projects.First(p => p.Id == DeploymentApiFactory.SeedProjectId);
        Assert.NotNull(project.LatestStatus);
        Assert.NotNull(project.LatestDeploymentTime);
    }
}
