using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Responses;

namespace Harbor.Authentication.IntegrationTests;

public class AuthenticationApiTests : IClassFixture<AuthenticationApiFactory>
{
    private readonly AuthenticationApiFactory _factory;

    public AuthenticationApiTests(AuthenticationApiFactory factory) => _factory = factory;

    private HttpClient CreateClient(int? userId = null, string role = "User")
    {
        var client = _factory.CreateClient();
        if (userId.HasValue)
        {
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId.Value, role));
        }
        return client;
    }

    [Fact]
    public async Task Register_ValidRequest_Returns201()
    {
        var client = CreateClient();
        var request = new RegisterRequest
        {
            Username = "newuser",
            Email = "newuser@example.com",
            Password = "StrongPassword123!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<RegisterResponse>>();
        Assert.NotNull(body?.Data);
        Assert.Equal("newuser", body!.Data!.Username);
        Assert.Equal("newuser@example.com", body.Data.Email);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns400()
    {
        var client = CreateClient();
        var request = new RegisterRequest
        {
            Username = "anotheruser",
            Email = "testuser@example.com", // Seeded email
            Password = "StrongPassword123!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/register", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200AndToken()
    {
        var client = CreateClient();
        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = "logintest",
            Email = "logintest@example.com",
            Password = "Password123!"
        });

        var request = new LoginRequest
        {
            Username = "logintest",
            Password = "Password123!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>();
        Assert.NotNull(body?.Data);
        Assert.NotNull(body!.Data!.Token);
        Assert.Equal("logintest", body.Data.Username);
    }

    [Fact]
    public async Task Login_InvalidCredentials_Returns401()
    {
        var client = CreateClient();
        await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = "loginfail",
            Email = "loginfail@example.com",
            Password = "Password123!"
        });

        var request = new LoginRequest
        {
            Username = "loginfail",
            Password = "WrongPassword!"
        };

        var response = await client.PostAsJsonAsync("/api/auth/login", request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetProfile_WithValidToken_Returns200AndProfileData()
    {
        var client = CreateClient();
        var regRes = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = "profiletest",
            Email = "profiletest@example.com",
            Password = "Password123!"
        });
        
        // Wait, registering doesn't return a token anymore based on our previous fix (the DTO changed).
        // Let's log in to get the token.
        var loginRes = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Username = "profiletest", Password = "Password123!" });
        var loginBody = await loginRes.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>();
        var token = loginBody!.Data!.Token;

        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await authClient.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<ProfileResponse>>();
        Assert.NotNull(body?.Data);
        Assert.Equal("profiletest", body!.Data!.Username);
        Assert.Equal("profiletest@example.com", body.Data.Email);
    }

    [Fact]
    public async Task GetProfile_NoToken_Returns401()
    {
        var client = CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task UpdateProfile_ValidData_UpdatesUser()
    {
        // Register a new user to update
        var client = CreateClient();
        var registerResponse = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Username = "updatetest",
            Email = "update@example.com",
            Password = "Password123!"
        });
        
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Username = "updatetest", Password = "Password123!" });
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<ApiResponse<LoginResponse>>();
        
        var authClient = _factory.CreateClient();
        authClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginBody!.Data!.Token);

        var updateRequest = new ProfileRequest
        {
            Username = "updateduser",
            Email = "update2@example.com"
        };

        var response = await authClient.PutAsJsonAsync("/api/auth/me", updateRequest);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<ApiResponse<ProfileResponse>>();
        Assert.NotNull(body?.Data);
        Assert.Equal("updateduser", body!.Data!.Username);
        Assert.Equal("update2@example.com", body.Data.Email);
    }
}
