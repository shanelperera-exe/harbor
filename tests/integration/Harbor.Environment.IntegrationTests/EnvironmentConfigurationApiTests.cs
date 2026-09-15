using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Environment.DTOs;
using Harbor.Environment.Responses;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Xunit;

namespace Harbor.Environment.IntegrationTests;

public class EnvironmentConfigurationApiTests(EnvironmentApiFactory factory) : IClassFixture<EnvironmentApiFactory>
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
        await using var command = new NpgsqlCommand("INSERT INTO \"Projects\" (\"Name\", \"OwnerId\") VALUES (@name, @ownerId) RETURNING \"Id\"", connection);
        command.Parameters.AddWithValue("name", $"project-{Guid.NewGuid():N}");
        command.Parameters.AddWithValue("ownerId", ownerId);
        return Convert.ToInt32(await command.ExecuteScalarAsync());
    }

    private async Task<int> CreateEnvironmentAsync(int projectId, string name, string type, int userId)
    {
        var client = Client(userId);
        var response = await client.PostAsJsonAsync($"/api/projects/{projectId}/environments", new CreateEnvironmentRequest { Name = name, Type = type });
        var created = (await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentResponse>>())!.Data!;
        return created.Id;
    }

    private async Task<HttpResponseMessage> ConfigureAsync(int projectId, int environmentId, ConfigureEnvironmentRequest request, int userId, string role = "User")
    {
        return await Client(userId, role).PutAsJsonAsync(
            $"/api/projects/{projectId}/environments/{environmentId}/configuration", request);
    }

    private async Task<long> CountConfigurationRowsAsync(int environmentId)
    {
        await using var connection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb"));
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "SELECT COUNT(1) FROM \"EnvironmentConfigurations\" WHERE \"EnvironmentId\" = @envId", connection);
        command.Parameters.AddWithValue("envId", environmentId);
        return Convert.ToInt64(await command.ExecuteScalarAsync());
    }

    private async Task<string?> QueryScalarAsync(string sql, params (string name, object value)[] parameters)
    {
        await using var connection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb"));
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(sql, connection);
        foreach (var (name, value) in parameters)
            command.Parameters.AddWithValue(name, value);
        var result = await command.ExecuteScalarAsync();
        return result is null or DBNull ? null : (string)result;
    }

    // -------------------------------------------------------------------------------------
    // Scenario 1 — Configure environment
    // -------------------------------------------------------------------------------------

    [Fact]
    public async Task Configure_ValidConfiguration_SavesAndReturnsResponse()
    {
        var projectId = await CreateProjectAsync(9001);
        var environmentId = await CreateEnvironmentAsync(projectId, "Production", "Production", 9001);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://prod.example.com",
            Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "harbor" }],
            SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "p@ssw0rd" }]
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9001);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<EnvironmentConfigurationResponse>>();
        Assert.Equal(environmentId, body!.Data!.EnvironmentId);
        Assert.Equal("https://prod.example.com", body.Data.DeploymentUrl);
        Assert.Equal("aws", body.Data.Provider);
        Assert.Single(body.Data.Configuration);
        Assert.Equal("harbor", body.Data.Configuration[0].Value);

        Assert.Single(body.Data.SecureValues);
        Assert.Equal("db.password", body.Data.SecureValues[0].Key);
        Assert.True(body.Data.SecureValues[0].IsSet);
    }

    [Fact]
    public async Task Configure_ThenGet_ReturnsSavedConfiguration()
    {
        var projectId = await CreateProjectAsync(9002);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9002);
        var client = Client(9002);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com",
            Provider = "azure",
            Configuration = [
                new ConfigurationItemRequest { Key = "app.name", Value = "harbor" },
                new ConfigurationItemRequest { Key = "region", Value = "ukw" }
            ],
            SecureValues = [new ConfigurationItemRequest { Key = "api.key", Value = "topsecret" }]
        };

        var configureResponse = await ConfigureAsync(projectId, environmentId, request, userId: 9002);
        Assert.Equal(HttpStatusCode.OK, configureResponse.StatusCode);

        var getResponse = await client.GetAsync($"/api/projects/{projectId}/environments/{environmentId}/configuration");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var body = await getResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentConfigurationResponse>>();
        Assert.Equal("https://dev.example.com", body!.Data!.DeploymentUrl);
        Assert.Equal("azure", body!.Data.Provider);
        Assert.Equal(2, body.Data.Configuration.Count);
        Assert.Contains(body.Data.Configuration, c => c.Key == "app.name" && c.Value == "harbor");
        Assert.Single(body.Data.SecureValues);
        Assert.True(body.Data.SecureValues[0].IsSet);
        Assert.Equal("api.key", body.Data.SecureValues[0].Key);
        Assert.DoesNotContain("topsecret", body.Data.SecureValues[0].Key);
    }

    [Fact]
    public async Task Configure_AdminUser_CanConfigure()
    {
        var projectId = await CreateProjectAsync(9003);
        var environmentId = await CreateEnvironmentAsync(projectId, "prod", "Production", 9003);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://prod.example.com",
            Provider = "gcp",
            Configuration = [],
            SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9999, role: "Admin");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // -------------------------------------------------------------------------------------
    // Scenario 2 — Validate required configuration
    // -------------------------------------------------------------------------------------

    [Theory]
    [InlineData(null, "aws")]
    [InlineData("", "aws")]
    [InlineData("   ", "aws")]
    public async Task Configure_MissingDeploymentUrl_Returns400(string? url, string provider)
    {
        var projectId = await CreateProjectAsync(9004);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9004);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = url, Provider = provider,
            Configuration = [], SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9004);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("ftp://evil.com")]
    [InlineData("not-a-url")]
    [InlineData("httpsexample.com")]
    public async Task Configure_InvalidDeploymentUrl_Returns400(string url)
    {
        var projectId = await CreateProjectAsync(9005);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9005);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = url, Provider = "aws",
            Configuration = [], SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9005);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Configure_MissingProvider_Returns400(string? provider)
    {
        var projectId = await CreateProjectAsync(9006);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9006);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = provider,
            Configuration = [], SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9006);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configure_ConfigurationItemMissingKey_Returns400()
    {
        var projectId = await CreateProjectAsync(9007);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9007);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "", Value = "val" }],
            SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9007);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configure_ConfigurationItemMissingValue_Returns400()
    {
        var projectId = await CreateProjectAsync(9008);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9008);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "" }],
            SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9008);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configure_NewSecureValueMissingValue_Returns400()
    {
        var projectId = await CreateProjectAsync(9009);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9009);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [],
            SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = "" }]
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9009);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configure_DuplicateKeysAcrossConfigAndSecrets_Returns400()
    {
        var projectId = await CreateProjectAsync(9010);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9010);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "shared", Value = "v1" }],
            SecureValues = [new ConfigurationItemRequest { Key = "shared", Value = "s3cret" }]
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9010);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Configure_OtherUsersEnvironment_Returns403()
    {
        var projectId = await CreateProjectAsync(9011);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9011);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [], SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9012);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Configure_NonExistentEnvironment_Returns400()
    {
        var projectId = await CreateProjectAsync(9013);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [], SecureValues = []
        };

        var response = await ConfigureAsync(projectId, 999999, request, userId: 9013);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // -------------------------------------------------------------------------------------
    // Scenario 3 — Protect sensitive information
    // -------------------------------------------------------------------------------------

    [Fact]
    public async Task Configure_SecureValuesAreEncryptedInDatabase()
    {
        var projectId = await CreateProjectAsync(9014);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9014);

        var plaintextSecret = "my-super-secret-value-12345";
        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [],
            SecureValues = [new ConfigurationItemRequest { Key = "db.password", Value = plaintextSecret }]
        };

        var configureResponse = await ConfigureAsync(projectId, environmentId, request, userId: 9014);
        Assert.Equal(HttpStatusCode.OK, configureResponse.StatusCode);

        var storedValue = await QueryScalarAsync(
            "SELECT \"Value\" FROM \"EnvironmentConfigurations\" WHERE \"EnvironmentId\" = @envId AND \"Key\" = 'db.password' AND \"IsSecret\" = TRUE",
            ("envId", environmentId));

        Assert.NotNull(storedValue);
        Assert.NotEqual(plaintextSecret, storedValue);
        Assert.DoesNotContain(plaintextSecret, storedValue);
    }

    [Fact]
    public async Task Configure_PlaintextConfigValuesAreStoredAsPlaintext()
    {
        var projectId = await CreateProjectAsync(9015);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9015);

        var request = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://dev.example.com", Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "harbor-ui" }],
            SecureValues = []
        };

        var response = await ConfigureAsync(projectId, environmentId, request, userId: 9015);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var storedValue = await QueryScalarAsync(
            "SELECT \"Value\" FROM \"EnvironmentConfigurations\" WHERE \"EnvironmentId\" = @envId AND \"Key\" = 'app.name' AND \"IsSecret\" = FALSE",
            ("envId", environmentId));

        Assert.Equal("harbor-ui", storedValue);
    }

    [Fact]
    public async Task Configure_UpdatesOverwritePreviousConfiguration()
    {
        var projectId = await CreateProjectAsync(9016);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9016);

        var firstRequest = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://old.example.com", Provider = "aws",
            Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "old-app" }],
            SecureValues = [new ConfigurationItemRequest { Key = "token", Value = "old-token" }]
        };
        var firstResponse = await ConfigureAsync(projectId, environmentId, firstRequest, userId: 9016);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var secondRequest = new ConfigureEnvironmentRequest
        {
            DeploymentUrl = "https://new.example.com", Provider = "azure",
            Configuration = [new ConfigurationItemRequest { Key = "app.name", Value = "new-app" }],
            SecureValues = [new ConfigurationItemRequest { Key = "token", Value = "new-token" }]
        };
        var secondResponse = await ConfigureAsync(projectId, environmentId, secondRequest, userId: 9016);
        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

        var secondBody = await secondResponse.Content.ReadFromJsonAsync<ApiResponse<EnvironmentConfigurationResponse>>();
        Assert.Equal("https://new.example.com", secondBody!.Data!.DeploymentUrl);
        Assert.Equal("new-app", secondBody.Data.Configuration[0].Value);
        Assert.Single(secondBody.Data.SecureValues);

        Assert.Equal(2L, await CountConfigurationRowsAsync(environmentId));
    }

    [Fact]
    public async Task Get_WithoutToken_Returns401()
    {
        var projectId = await CreateProjectAsync(9017);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9017);

        var response = await _factory.CreateClient().GetAsync(
            $"/api/projects/{projectId}/environments/{environmentId}/configuration");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_InactiveEnvironment_Returns400()
    {
        var projectId = await CreateProjectAsync(9018);
        var environmentId = await CreateEnvironmentAsync(projectId, "dev", "Development", 9018);

        await using var connection = new Npgsql.NpgsqlConnection(_factory.Services.GetRequiredService<IConfiguration>().GetConnectionString("HarborDb"));
        await connection.OpenAsync();
        await using var command = new NpgsqlCommand(
            "UPDATE \"Environments\" SET \"IsActive\" = FALSE, \"DeactivatedAt\" = NOW() WHERE \"Id\" = @envId", connection);
        command.Parameters.AddWithValue("envId", environmentId);
        await command.ExecuteNonQueryAsync();

        var response = await Client(9018).GetAsync(
            $"/api/projects/{projectId}/environments/{environmentId}/configuration");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
