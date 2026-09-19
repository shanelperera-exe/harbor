namespace Harbor.Project.DTOs
{
    public class CreateServiceRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? RepositoryUrl { get; set; }
        public string? RepositoryName { get; set; }
        public string? RepositoryBranch { get; set; }
    }
}
