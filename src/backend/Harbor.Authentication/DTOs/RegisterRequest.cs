using System.ComponentModel.DataAnnotations;

namespace Harbor.Authentication.DTOs
{
    public class RegisterRequest
    {
        public string Username { get; set; } = string.Empty;

        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        public string Password { get; set; } = string.Empty;
    }
}
