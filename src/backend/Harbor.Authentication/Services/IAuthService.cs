using Harbor.Authentication.DTOs;

namespace Harbor.Authentication.Services
{
    public interface IAuthService
    {
        Task<(bool Success, string? Error, RegisterResponse? Data)> RegisterAsync(RegisterRequest request);
    }
}