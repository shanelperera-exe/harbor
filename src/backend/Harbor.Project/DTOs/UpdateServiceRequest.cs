namespace Harbor.Project.DTOs
{
    public class UpdateServiceRequest
    {
        public string? WorkflowFile { get; set; }
        public string? BuildCommand { get; set; }
        public string? StartCommand { get; set; }
    }
}