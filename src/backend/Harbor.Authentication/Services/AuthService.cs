using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using System.Text.Json.Nodes;
using DiceBear;

namespace Harbor.Authentication.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IJwtService _jwtService;
        private readonly IEmailService _emailService;

        public AuthService(IUserRepository userRepository, IJwtService jwtService, IEmailService emailService)
        {
            _userRepository = userRepository;
            _jwtService = jwtService;
            _emailService = emailService;
        }

        private static string GenerateAvatar(string seed)
        {
            var style = Style.Parse(Styles.Identicon);
            var avatar = new Avatar(style, new JsonObject
            {
                ["seed"] = seed
            });
            return avatar.ToSvg();
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

            var existing = await _userRepository.GetByUsernameOrEmailAsync(request.Username, request.Email);
            if (existing != null)
            {
                return (false, "An account with this username or email already exists.", null);
            }

            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            var avatarSvg = GenerateAvatar(request.Username);

            var newUser = new Models.User
            {
                Username = request.Username,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = Models.Roles.User,
                AvatarSvg = avatarSvg
            };

            var newId = await _userRepository.CreateUserAsync(newUser);

            var response = new RegisterResponse
            {
                Id = newId,
                Username = newUser.Username,
                Email = newUser.Email,
                Role = newUser.Role,
                AvatarSvg = avatarSvg
            };

            // Send Welcome Email
            try
            {
                var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "EmailTemplates", "WelcomeEmail.html");
                if (File.Exists(templatePath))
                {
                    var template = await File.ReadAllTextAsync(templatePath);
                    template = template.Replace("{{UserName}}", newUser.Username);
                    await _emailService.SendEmailAsync(newUser.Email, "Welcome to Harbor!", template);
                }
            }
            catch
            {
                // Ignore email errors on registration so we don't fail the request
            }

            return (true, null, response);
        }

        public async Task<(bool Success, string? Error, LoginResponse? Data)> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return (false, "Username or email and password are required.", null);
            }

            var user = await _userRepository.GetByUsernameOrEmailAsync(request.Username, request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return (false, "Invalid username or password.", null);
            }

            // Backfill avatar for accounts created before DiceBear was introduced
            if (string.IsNullOrEmpty(user.AvatarSvg))
            {
                user.AvatarSvg = GenerateAvatar(user.Username);
                await _userRepository.UpdateAvatarAsync(user.Id, user.AvatarSvg);
            }

            var (token, expiresAt) = _jwtService.GenerateToken(user);

            var response = new LoginResponse
            {
                Token = token,
                Username = user.Username,
                Email = user.Email,
                Role = user.Role,
                ExpiresAt = expiresAt,
                AvatarSvg = user.AvatarSvg
            };

            return (true, null, response);
        }

        public async Task<(bool Success, string? Error)> ForgotPasswordAsync(ForgotPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            if (user == null)
            {
                // Don't leak that the user exists or not
                return (true, null);
            }

            var token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));
            var expiry = DateTime.UtcNow.AddHours(1);

            await _userRepository.UpdatePasswordResetTokenAsync(user.Id, token, expiry);

            var resetLink = $"http://localhost:5173/reset-password?email={Uri.EscapeDataString(user.Email)}&token={Uri.EscapeDataString(token)}";

            try
            {
                var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "EmailTemplates", "PasswordReset.html");
                if (File.Exists(templatePath))
                {
                    var template = await File.ReadAllTextAsync(templatePath);
                    template = template.Replace("{{ResetLink}}", resetLink);
                    await _emailService.SendEmailAsync(user.Email, "Harbor Password Reset", template);
                }
            }
            catch
            {
                // Ignore email send errors to client
            }

            return (true, null);
        }

        public async Task<(bool Success, string? Error)> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var user = await _userRepository.GetByEmailAsync(request.Email);
            
            if (user == null || user.PasswordResetToken != request.Token || user.PasswordResetTokenExpiry < DateTime.UtcNow)
            {
                return (false, "Invalid or expired reset token.");
            }

            var newPasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            await _userRepository.UpdatePasswordAsync(user.Id, newPasswordHash);
            await _userRepository.UpdatePasswordResetTokenAsync(user.Id, null, null); // Clear the token

            return (true, null);
        }
    }
}
