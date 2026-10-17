using Harbor.Authentication.Models;

namespace Harbor.Authentication.Services
{
    public interface IJwtService
    {
        (string Token, DateTime ExpiresAt) GenerateToken(User user);
        string GenerateLinkToken(int userId);
        int? ValidateLinkToken(string token);
    }
}
