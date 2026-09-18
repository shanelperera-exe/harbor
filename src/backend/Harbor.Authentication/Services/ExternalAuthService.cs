using System.Security.Claims;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;

namespace Harbor.Authentication.Services
{
    public interface IExternalAuthService
    {
        Task<(bool Success, string? Error, LoginResponse? Data)> LoginOrRegisterAsync(ClaimsPrincipal principal);
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

        public async Task<(bool Success, string? Error, LoginResponse? Data)> LoginOrRegisterAsync(ClaimsPrincipal principal)
        {
            var email = principal.FindFirstValue(ClaimTypes.Email) ?? principal.FindFirstValue("email");
            if (string.IsNullOrWhiteSpace(email))
            {
                return (false, "The provider did not return an email address.", null);
            }

            var user = await _userRepository.GetByEmailAsync(email);
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
                    Role = Roles.User,
                    AvatarSvg = string.Empty
                };
                user.Id = await _userRepository.CreateUserAsync(user);
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

        private static string BuildUsername(ClaimsPrincipal principal, string email)
        {
            var name = principal.FindFirstValue(ClaimTypes.Name) ?? principal.FindFirstValue("login") ?? email.Split('@')[0];
            var username = new string(name.Where(char.IsLetterOrDigit).ToArray());
            return string.IsNullOrWhiteSpace(username) ? $"user-{Guid.NewGuid():N}"[..13] : username[..Math.Min(username.Length, 50)];
        }
    }
}