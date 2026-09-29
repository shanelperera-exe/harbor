using System.ComponentModel.DataAnnotations;

namespace Harbor.Authentication.DTOs
{
    public class AccountPreferencesRequest
    {
        [Required]
        public string DashboardTheme { get; set; } = "system";

        [Required]
        public string LogTheme { get; set; } = "match-dashboard";
    }
}
