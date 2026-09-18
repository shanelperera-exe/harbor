using System.Security.Claims;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;

namespace Harbor.Authentication.Services
{
    public interface IExternalAuthService
    {
        Task<(bool Success, string? Error, LoginResponse? Data)> LoginOrRegisterAsync(ClaimsPrincipal principal, string provider, string? accessToken = null);
        Task<(bool Success, string? Error)> LinkAsync(int userId, ClaimsPrincipal principal, string provider, string? accessToken = null);
    }

    public class ExternalAuthService : IExternalAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;

        public ExternalAuthService(IUserRepository userRepository, IJwtService jwtService)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
        }

        public async Task<(bool Success, string? Error, LoginResponse? Data)> LoginOrRegisterAsync(ClaimsPrincipal principal, string provider, string? accessToken = null)
        {
            var providerUserId = GetProviderUserId(principal);
            if (string.IsNullOrWhiteSpace(providerUserId))
            {
                return (false, "The provider did not return a stable user identifier.", null);
            }

            var email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email");
            if (string.IsNullOrWhiteSpace(email))
            {
                return (false, "The provider did not return an email address.", null);
            }

            var user = await _userRepository.GetByExternalIdentityAsync(provider, providerUserId)
                ?? await _userRepository.GetByEmailAsync(email);
            if (user == null)
            {
                var username = BuildUsername(principal, email);
                if (await _userRepository.GetByUsernameAsync(username) != null)
                {
                    username = $"{username}-{Guid.NewGuid():N}"[..Math.Min(username.Length + 33, 50)];
                }

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

            await _userRepository.AddExternalLoginMethodAsync(user.Id, provider);
            await _userRepository.AddExternalIdentityAsync(user.Id, provider, providerUserId, email, accessToken);
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

        public async Task<(bool Success, string? Error)> LinkAsync(int userId, ClaimsPrincipal principal, string provider, string? accessToken = null)
        {
            var providerUserId = GetProviderUserId(principal);
            if (string.IsNullOrWhiteSpace(providerUserId)) return (false, "The provider did not return a stable user identifier.");

            var linkedUser = await _userRepository.GetByExternalIdentityAsync(provider, providerUserId);
            if (linkedUser != null && linkedUser.Id != userId)
            {
                return (false, "This provider account is already linked to another Harbor account.");
            }

            var email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email");
            await _userRepository.AddExternalIdentityAsync(userId, provider, providerUserId, email, accessToken);
            await _userRepository.AddExternalLoginMethodAsync(userId, provider);
            return (true, null);
        }

        private static string? GetProviderUserId(ClaimsPrincipal principal) =>
            principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub");

        private static string BuildUsername(ClaimsPrincipal principal, string email)
        {
            var name = principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue("login") ?? email.Split('@')[0];
            var username = new string(name.Where(char.IsLetterOrDigit).ToArray());
            return string.IsNullOrWhiteSpace(username) ? $"user-{Guid.NewGuid():N}"[..13] : username[..Math.Min(username.Length, 50)];
        }
    }
}