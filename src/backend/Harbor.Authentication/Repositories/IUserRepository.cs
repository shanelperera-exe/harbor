using Harbor.Authentication.Models;

namespace Harbor.Authentication.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameOrEmailAsync(string username, string email);
        Task<int> CreateUserAsync(User user);
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByEmailAsync(string email);
        Task UpdatePasswordResetTokenAsync(int userId, string? token, DateTime? expiry);
        Task<User?> GetByResetTokenAsync(string token);
        Task UpdatePasswordAsync(int userId, string passwordHash);
        Task UpdateAvatarAsync(int userId, string avatarSvg);
    }
}
