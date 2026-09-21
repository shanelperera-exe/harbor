namespace Harbor.Deployment.Services;

public sealed class GitHubActionsOptions
{
    public string ApiBaseUrl { get; set; } = "https://api.github.com/";
    public string DefaultWorkflowFile { get; set; } = "deploy.yml";
    public string? AuthServiceClientUrl { get; set; }
}
