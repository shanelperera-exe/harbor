namespace Harbor.Authentication.DTOs
{
    public class ProfileResponse
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? AvatarSvg { get; set; }
        public string[] LoginMethods { get; set; } = Array.Empty<string>();
        public bool HasPassword { get; set; }
    }
}