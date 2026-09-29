namespace Harbor.Authentication.Models
{
    public class UserPreferences
    {
        public int UserId { get; set; }
        public string DashboardTheme { get; set; } = "system";
        public string LogTheme { get; set; } = "match-dashboard";
        public DateTime? UpdatedAt { get; set; }
    }
}
