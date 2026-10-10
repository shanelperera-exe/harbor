using System.ComponentModel.DataAnnotations;

namespace Harbor.Reporting.DTOs
{
    public class LogIngestRequest
    {
        [Required]
        public string Level { get; set; } = string.Empty;

        [Required]
        public string Message { get; set; } = string.Empty;
        
        public string? Timestamp { get; set; }
    }
}
