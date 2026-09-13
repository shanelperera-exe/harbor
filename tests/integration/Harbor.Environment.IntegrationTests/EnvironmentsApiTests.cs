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
}
