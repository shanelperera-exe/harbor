using System;

namespace Harbor.Authentication.DTOs
{
    public class AdminUserDto
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = "active";
        public DateTime CreatedAt { get; set; }
        public string? AvatarSvg { get; set; }
        public int ProjectCount { get; set; }
    }

    public class UpdateRoleRequest
    {
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
