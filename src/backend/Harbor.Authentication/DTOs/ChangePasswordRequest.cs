using System.ComponentModel.DataAnnotations;

namespace Harbor.Authentication.DTOs
{
    public class ChangePasswordRequest
    {
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters long")]
        public string NewPassword { get; set; } = string.Empty;
    }
}