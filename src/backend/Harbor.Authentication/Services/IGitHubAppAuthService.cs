using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;

namespace Harbor.Authentication.Services;

public interface IGitHubAppAuthService
{
    Task<GitHubAppAuthStartResponse?> StartAuthFlowAsync();
    Task<(bool Success, string? Error, LoginResponse? Data)> CompleteAuthFlowAsync(string code, string state, string codeVerifier);
    Task<(bool Success, string? Error)> LinkAccountAsync(int userId, string code, string state, string codeVerifier);
}

