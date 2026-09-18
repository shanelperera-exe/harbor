namespace Harbor.Project.Models
{
    public class ServiceEntity
    {
        public int Id { get; set; }
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? RepositoryUrl { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
