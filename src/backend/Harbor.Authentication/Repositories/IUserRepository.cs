using Harbor.Authentication.Models;

namespace Harbor.Authentication.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameOrEmailAsync(string username, string email);
        Task<int> CreateUserAsync(User user);
        Task<User?> GetByUsernameAsync(string username);
    }
}
