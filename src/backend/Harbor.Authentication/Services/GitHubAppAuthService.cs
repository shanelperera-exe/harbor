using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Harbor.GitHub.Services;
using Microsoft.Extensions.Options;

namespace Harbor.Authentication.Services;

public sealed class GitHubAppAuthService : IGitHubAppAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly IGitHubAppOAuthClient _oauthClient;
    private readonly IGitHubAppApiClient _appClient;
    private readonly IEncryptionService _encryptionService;
    private readonly IGitHubAppInstallationProvider _installationProvider;
    private readonly IHttpClientFactory _httpClientFactory;

    public GitHubAppAuthService(
        IUserRepository userRepository,
        IJwtService jwtService,
        IGitHubAppOAuthClient oauthClient,
        IGitHubAppApiClient appClient,
        IEncryptionService encryptionService,
        IGitHubAppInstallationProvider installationProvider,
        IHttpClientFactory httpClientFactory)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _oauthClient = oauthClient;
        _appClient = appClient;
        _encryptionService = encryptionService;
        _installationProvider = installationProvider;
        _httpClientFactory = httpClientFactory;
    }

    public Task<GitHubAppAuthStartResponse?> StartAuthFlowAsync()
    {
        var appId = Environment.GetEnvironmentVariable("GITHUB_APP_CLIENT_ID");
        if (string.IsNullOrWhiteSpace(appId))
            return Task.FromResult<GitHubAppAuthStartResponse?>(null);

        var state = GitHubAppOAuthHelper.GenerateState();
        var codeVerifier = GitHubAppOAuthHelper.GenerateCodeVerifier();
        var codeChallenge = GitHubAppOAuthHelper.GenerateCodeChallenge(codeVerifier);

        var redirectUrl = _oauthClient.BuildAuthorizationUrl(state, codeChallenge);

        return Task.FromResult<GitHubAppAuthStartResponse?>(new GitHubAppAuthStartResponse
        {
            RedirectUrl = redirectUrl,
            State = state,
            CodeVerifier = codeVerifier
        });
    }

    public async Task<(bool Success, string? Error, LoginResponse? Data)> CompleteAuthFlowAsync(
        string code, string state, string codeVerifier)
    {
        var exchangeResult = await ExchangeCodeAsync(code, state, codeVerifier);
        if (exchangeResult == null)
            return (false, "Failed to exchange authorization code for GitHub access token.", null);

        var (accessToken, userInfo, installationId) = exchangeResult.Value;

        // Look up or create the Harbor user
        var provider = "github";
        var externalUser = await _userRepository.GetByExternalIdentityAsync(provider, userInfo.Id.ToString());

        User? user;
        if (externalUser == null)
        {
            var email = userInfo.Email ?? userInfo.Name ?? $"gh_{userInfo.Id}@users.noreply.github.com";
            user = await _userRepository.GetByEmailAsync(email);
        }
        else
        {
            user = externalUser;
        }

        if (user == null)
        {
            var email = userInfo.Email ?? userInfo.Name ?? $"gh_{userInfo.Id}@users.noreply.github.com";
            var username = BuildUsername(userInfo.Login, email);

            user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString("N")),
                HasPassword = false,
                Role = Roles.User,
                AvatarSvg = string.Empty
            };
            user.Id = await _userRepository.CreateUserAsync(user);
        }

        // Store encrypted user token and installation ID
        var encryptedToken = _encryptionService.Encrypt(accessToken);
        await _userRepository.AddExternalIdentityAsync(
            user.Id, provider, userInfo.Id.ToString(),
            userInfo.Email ?? userInfo.Name, userInfo.Login, encryptedToken);

        if (installationId.HasValue)
        {
            await _userRepository.SetGitHubInstallationAsync(user.Id, installationId.Value);
        }

        var (token, expiresAt) = _jwtService.GenerateToken(user);

        return (true, null, new LoginResponse
        {
            Token = token,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = expiresAt,
            AvatarSvg = user.AvatarSvg
        });
    }

    public async Task<(bool Success, string? Error)> LinkAccountAsync(int userId, string code, string state, string codeVerifier)
    {
        var exchangeResult = await ExchangeCodeAsync(code, state, codeVerifier);
        if (exchangeResult == null)
            return (false, "Failed to exchange authorization code for GitHub access token.");

        var (accessToken, userInfo, installationId) = exchangeResult.Value;

        var provider = "github";
        var existing = await _userRepository.GetByExternalIdentityAsync(provider, userInfo.Id.ToString());
        if (existing != null && existing.Id != userId)
            return (false, "This GitHub account is already linked to another Harbor account.");

        var encryptedToken = _encryptionService.Encrypt(accessToken);
        await _userRepository.AddExternalIdentityAsync(
            userId, provider, userInfo.Id.ToString(),
            userInfo.Email ?? userInfo.Name, userInfo.Login, encryptedToken);

        if (installationId.HasValue)
            await _userRepository.SetGitHubInstallationAsync(userId, installationId.Value);

        return (true, null);
    }

    private async Task<(string accessToken, GitHubUserInfo userInfo, long? installationId)?> ExchangeCodeAsync(
        string code, string state, string codeVerifier)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(codeVerifier))
            return null;

        var tokenResponse = await _oauthClient.ExchangeCodeAsync(code, codeVerifier, state, CancellationToken.None);
        if (tokenResponse == null)
            return null;

        var accessToken = tokenResponse.AccessToken;

        var userInfo = await _oauthClient.GetUserInfoAsync(accessToken, CancellationToken.None);
        if (userInfo == null)
            return null;

        if (string.IsNullOrWhiteSpace(userInfo.Email))
        {
            var email = await FetchPrimaryEmailAsync(accessToken);
            if (!string.IsNullOrWhiteSpace(email))
                userInfo.Email = email;
        }

        var installationId = await _appClient.GetUserInstallationIdAsync(accessToken, CancellationToken.None);

        return (accessToken, userInfo, installationId);
    }

    private static string BuildUsername(string login, string email)
    {
        var name = string.IsNullOrWhiteSpace(login) ? email.Split('@')[0] : login;
        var username = new string(name.Where(char.IsLetterOrDigit).ToArray());
        if (string.IsNullOrWhiteSpace(username))
            username = $"user-{Guid.NewGuid():N}"[..13];
        return username[..Math.Min(username.Length, 50)];
    }

    private async Task<string?> FetchPrimaryEmailAsync(string accessToken)
    {
        using var client = _httpClientFactory.CreateClient("GitHubAppEmails");
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://api.github.com/user/emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        request.Headers.UserAgent.ParseAdd("Harbor");
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode) return null;

        var content = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(content);
        foreach (var email in doc.RootElement.EnumerateArray())
        {
            if (email.TryGetProperty("primary", out var p) && p.GetBoolean() &&
                email.TryGetProperty("verified", out var v) && v.GetBoolean())
                return email.GetProperty("email").GetString();
        }
        return null;
    }
}
