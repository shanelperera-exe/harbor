namespace Harbor.Authentication.DTOs
{
    public class AccountPreferencesResponse
    {
        public string DashboardTheme { get; set; } = "system";
        public string LogTheme { get; set; } = "match-dashboard";
        public DateTime? UpdatedAt { get; set; }
    }
}
