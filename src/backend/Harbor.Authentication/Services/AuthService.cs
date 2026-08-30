using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;

namespace Harbor.Authentication.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;

        public AuthService(IUserRepository userRepository, IJwtService jwtService)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
        }

        public async Task<(bool Success, string? Error, RegisterResponse? Data)> RegisterAsync(RegisterRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return (false, "Username, email, and password are all required.", null);
            }

            if (request.Password.Length < 8)
            {
                return (false, "Password must be at least 8 characters.", null);
            }

            if (!request.Email.Contains('@'))
            {
                return (false, "Email address is not valid.", null);
            }


            var allowedRoles = new[] { Models.Roles.Developer, Models.Roles.Viewer };
            if (!allowedRoles.Contains(request.Role))
            {
                return (false, "Role must be either Developer or Viewer.", null);
            }

            var existing = await _userRepository.GetByUsernameOrEmailAsync(request.Username, request.Email);
            if (existing != null)
            {
                return (false, "An account with this username or email already exists.", null);
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var newUser = new Models.User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = request.Role
            };

            var newId = await _userRepository.CreateUserAsync(newUser);

            var response = new RegisterResponse
            {
                Id = newId,
                Username = newUser.Username,
                Email = newUser.Email,
                Role = newUser.Role
            };

            return (true, null, response);
        }

        public async Task<(bool Success, string? Error, LoginResponse? Data)> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return (false, "Username and password are required.", null);
            }

            var user = await _userRepository.GetByUsernameAsync(request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return (false, "Invalid username or password.", null);
            }

            var (token, expiresAt) = _jwtService.GenerateToken(user);

            var response = new LoginResponse
            {
                Token = token,
                Username = user.Username,
                Role = user.Role,
                ExpiresAt = expiresAt
            };

            return (true, null, response);
        }
    }
}
