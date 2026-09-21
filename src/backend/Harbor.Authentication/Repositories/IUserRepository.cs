using Harbor.Authentication.Models;

namespace Harbor.Authentication.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameOrEmailAsync(string username, string email);
        Task<int> CreateUserAsync(User user);
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByIdAsync(int userId);
        Task UpdatePasswordResetTokenAsync(int userId, string? token, DateTime? expiry);
        Task<User?> GetByResetTokenAsync(string token);
        Task UpdatePasswordAsync(int userId, string passwordHash);
        Task UpdateAvatarAsync(int userId, string avatarSvg);
        Task UpdateProfileAsync(int userId, string username, string email, string avatarSvg);
        Task<string[]> GetExternalLoginMethodsAsync(int userId);
        Task AddExternalLoginMethodAsync(int userId, string provider);
        Task<bool> GetHasPasswordAsync(int userId);
        Task<User?> GetByExternalIdentityAsync(string provider, string providerUserId);
        Task AddExternalIdentityAsync(int userId, string provider, string providerUserId, string? providerEmail, string? accessToken = null);
        Task SetGitHubInstallationAsync(int userId, long installationId);
        Task<long?> GetGitHubInstallationAsync(int userId);
        Task<string?> GetExternalAccessTokenAsync(int userId, string provider);
        Task<UserPreferences> GetPreferencesAsync(int userId);
        Task<UserPreferences> UpsertPreferencesAsync(int userId, string dashboardTheme, string logTheme);
        Task<bool> RemoveExternalIdentityAsync(int userId, string provider);
        Task<bool> DeleteAccountAsync(int userId);
    }
}
