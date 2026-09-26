namespace Harbor.Project.DTOs
{
    public class UpdateServiceRequest
    {
        public string? WorkflowFile { get; set; }
        public string? BuildCommand { get; set; }
        public string? StartCommand { get; set; }
        public string? DeploymentUrl { get; set; }
        public System.Collections.Generic.List<ServiceDeploymentUrl>? DeploymentUrls { get; set; }
        public string? Provider { get; set; }
    }
}