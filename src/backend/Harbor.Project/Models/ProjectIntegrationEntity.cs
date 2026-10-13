using System;

namespace Harbor.Project.Models
{
    public class ProjectIntegrationEntity
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string ProviderType { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string ProviderToken { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
