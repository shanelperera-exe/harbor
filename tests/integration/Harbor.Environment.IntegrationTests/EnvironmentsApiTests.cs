using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Environment.DTOs;
using Harbor.Environment.Responses;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Harbor.Environment.IntegrationTests;

public class EnvironmentsApiTests(EnvironmentApiFactory factory) : IClassFixture<EnvironmentApiFactory>
{
    private readonly EnvironmentApiFactory _factory = factory;

    private HttpClient Client(int userId, string role = "User")
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
        return client;
    }

    private async Task<int> CreateProjectAsync(int ownerId)
    {
        await using var connection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb"));
        await connection.OpenAsync();
        await using var command = new Npgsql.NpgsqlCommand("INSERT INTO \"Projects\" (\"Name\", \"OwnerId\") VALUES (@name, @ownerId) RETURNING \"Id\"", connection);
        command.Parameters.AddWithValue("name", $"project-{Guid.NewGuid():N}");
        command.Parameters.AddWithValue("ownerId", ownerId);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    [Fact]
    public async Task Create_DevelopmentEnvironment_PersistsAndCanBeViewed()
    {
        var client = Client(101);
        var projectId = await CreateProjectAsync(101);

        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "Development", Type = "Development" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>();
        Assert.Equal(projectId, created!.Data!.ProjectId);
        var list = await client.GetFromJsonAsync<ApiResponse<List<EnvironmentResponse>>>($"/api/projects/{projectId}/environments");
        Assert.Contains(list!.Data!, environment => environment.Id == created.Data.Id && environment.Type == "Development");
    }

    [Theory]
    [InlineData("Development")]
    [InlineData("Staging")]
    [InlineData("Production")]
    public async Task Create_SupportedTypes_AreAccepted(string type)
    {
        var client = Client(102);
        var projectId = await CreateProjectAsync(102);
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = type, Type = type });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Create_UnsupportedType_Returns400()
    {
        var client = Client(103);
        var projectId = await CreateProjectAsync(103);
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "QA", Type = "QA" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_MissingName_Returns400()
    {
        var client = Client(107);
        var projectId = await CreateProjectAsync(107);
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "", Type = "Development" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_OtherUsersProject_Returns403()
    {
        var projectId = await CreateProjectAsync(104);
        var response = await Client(105).PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "Development", Type = "Development" });
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_NoToken_Returns401()
    {
        var projectId = await CreateProjectAsync(106);
        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "Development", Type = "Development" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Update_OwnerCanUpdateUnusedEnvironment()
    {
        var client = Client(108);
        var projectId = await CreateProjectAsync(108);
        var createdResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "dev", Type = "Development" });
        var created = (await createdResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>())!.Data!;

        var response = await client.PutAsJsonAsync($"/api/projects/{projectId}/environments/{created.Id}", new UpdateEnvironmentRequest { Name = "staging target", Type = "Staging" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>();
        Assert.Equal("staging target", updated!.Data!.Name);
        Assert.Equal("Staging", updated.Data.Type);
    }

    [Fact]
    public async Task Delete_UnusedEnvironment_RemovesIt()
    {
        var client = Client(109);
        var projectId = await CreateProjectAsync(109);
        var createdResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "dev", Type = "Development" });
        var created = (await createdResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>())!.Data!;

        var response = await client.DeleteAsync($"/api/projects/{projectId}/environments/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var removal = await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentRemovalResponse>>();
        Assert.False(removal!.Data!.Deactivated);
        var list = await client.GetFromJsonAsync<ApiResponse<List<EnvironmentResponse>>>($"/api/projects/{projectId}/environments");
        Assert.Empty(list!.Data!);
    }

    [Fact]
    public async Task Delete_EnvironmentWithDeploymentHistory_DeactivatesAndPreservesDeployment()
    {
        var client = Client(110);
        var projectId = await CreateProjectAsync(110);
        var createdResponse = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "production", Type = "Production" });
        var created = (await createdResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>())!.Data!;
        await using (var connection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb")))
        {
            await connection.OpenAsync();
            await using var command = new Npgsql.NpgsqlCommand("INSERT INTO \"Deployments\" (\"ProjectId\", \"OwnerId\", \"Environment\", \"Version\", \"Status\", \"StartedAt\") VALUES (@projectId, 110, 'production', '1.0.0', 'Succeeded', NOW())", connection);
            command.Parameters.AddWithValue("projectId", projectId);
            await command.ExecuteNonQueryAsync();
        }

        var response = await client.DeleteAsync($"/api/projects/{projectId}/environments/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var removal = await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentRemovalResponse>>();
        Assert.True(removal!.Data!.Deactivated);
        Assert.Contains("deployment history", removal.Data.Message);
        var list = await client.GetFromJsonAsync<ApiResponse<List<EnvironmentResponse>>>($"/api/projects/{projectId}/environments");
        Assert.Empty(list!.Data!);
        await using var verifyConnection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb"));
        await verifyConnection.OpenAsync();
        await using var verify = new Npgsql.NpgsqlCommand("SELECT COUNT(1) FROM \"Deployments\" WHERE \"ProjectId\" = @projectId", verifyConnection);
        verify.Parameters.AddWithValue("projectId", projectId);
        Assert.Equal(1L, Convert.ToInt64(await verify.ExecuteScalarAsync()));
    }

    [Fact]
    public async Task Delete_OtherUsersEnvironment_Returns403()
    {
        var projectId = await CreateProjectAsync(111);
        var owner = Client(111);
        var createdResponse = await owner.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = "dev", Type = "Development" });
        var created = (await createdResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>())!.Data!;

        var response = await Client(112).DeleteAsync($"/api/projects/{projectId}/environments/{created.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
