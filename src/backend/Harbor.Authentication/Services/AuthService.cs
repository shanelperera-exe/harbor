using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;

namespace Harbor.Authentication.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;

        public AuthService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<(bool Success, string? Error, RegisterResponse? Data)> RegisterAsync(RegisterRequest request)
        {
            // Scenario 3: Invalid registration data
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

            // Scenario 2: Duplicate account
            var existing = await _userRepository.GetByUsernameOrEmailAsync(request.Username, request.Email);
            if (existing != null)
            {
                return (false, "An account with this username or email already exists.", null);
            }

            // Scenario 4: Secure password storage
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var newUser = new User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = "Developer"
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
    }
}