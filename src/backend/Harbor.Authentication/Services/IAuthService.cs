using Harbor.Authentication.DTOs;

namespace Harbor.Authentication.Services
{
    public interface IAuthService
    {
        Task<(bool Success, string? Error, RegisterResponse? Data)> RegisterAsync(RegisterRequest request);
        Task<(bool Success, string? Error, LoginResponse? Data)> LoginAsync(LoginRequest request);
        Task<(bool Success, string? Error)> ForgotPasswordAsync(ForgotPasswordRequest request);
        Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request);
        Task<(bool Success, string? Error)> ChangePasswordAsync(int userId, ChangePasswordRequest request);
        Task<(bool Success, string? Error, ProfileResponse? Data)> GetProfileAsync(int userId);
        Task<(bool Success, string? Error, ProfileResponse? Data)> UpdateProfileAsync(int userId, ProfileRequest request);
        Task<(bool Success, string? Error, AccountPreferencesResponse? Data)> UpdatePreferencesAsync(int userId, AccountPreferencesRequest request);
        Task<(bool Success, string? Error, ProfileResponse? Data)> UnlinkExternalLoginAsync(int userId, string provider);
        Task<(bool Success, string? Error)> DeleteAccountAsync(int userId);
    }
}
