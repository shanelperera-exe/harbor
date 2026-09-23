namespace Harbor.Project.Models
{
    public class ServiceEntity
    {
        public int Id { get; set; }
        public string PublicId { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? RepositoryUrl { get; set; }
        public string? RepositoryName { get; set; }
        public string? RepositoryBranch { get; set; }
        public string? RepositoryCommit { get; set; }
        public string? WorkflowFile { get; set; }
        public string? BuildCommand { get; set; }
        public string? StartCommand { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
