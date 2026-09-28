namespace Harbor.Project.DTOs
{
    public class CreateServiceRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string? RepositoryUrl { get; set; }
        public string? RepositoryName { get; set; }
        public string? RepositoryBranch { get; set; }
        public string? RepositoryCommit { get; set; }
        public string? WorkflowFile { get; set; }
        public string? BuildCommand { get; set; }
        public string? StartCommand { get; set; }
        public string? DeploymentUrl { get; set; }
        public System.Collections.Generic.List<ServiceDeploymentUrl>? DeploymentUrls { get; set; }
        public string? Provider { get; set; }
        public bool IsPrivate { get; set; }
    }
}
