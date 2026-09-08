using Harbor.Authentication.DTOs;

namespace Harbor.Authentication.Services
{
    public interface IAuthService
    {
        Task<(bool Success, string? Error, RegisterResponse? Data)> RegisterAsync(RegisterRequest request);
        Task<(bool Success, string? Error, LoginResponse? Data)> LoginAsync(LoginRequest request);
        Task<(bool Success, string? Error)> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
    }
}
