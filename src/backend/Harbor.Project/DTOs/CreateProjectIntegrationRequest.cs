using System.ComponentModel.DataAnnotations;

namespace Harbor.Project.DTOs
{
    public class CreateProjectIntegrationRequest
    {
        [Required]
        public string ProviderType { get; set; } = string.Empty;
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        public string ProviderToken { get; set; } = string.Empty;
    }
}
