using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace Harbor.Deployment.Services;

public sealed record WorkflowDispatchRequest(
    string Owner,
    string Repository,
    string WorkflowFile,
    string Ref,
    IReadOnlyDictionary<string, string> Inputs,
    string? InstallationToken = null);

public sealed record WorkflowDispatchResult(bool Succeeded, string? Error);

public interface IGitHubActionsClient
{
    Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default);
}

public sealed class GitHubActionsClient(HttpClient httpClient, IOptions<GitHubActionsOptions> options, ILogger<GitHubActionsClient> logger) : IGitHubActionsClient
{
    private readonly GitHubActionsOptions _options = options.Value;

    public async Task<WorkflowDispatchResult> DispatchAsync(WorkflowDispatchRequest request, CancellationToken cancellationToken = default)
    {
        var token = request.InstallationToken;
        if (string.IsNullOrWhiteSpace(token))
            return new(false, "GitHub Actions is not configured: no installation token available.");

        using var message = new HttpRequestMessage(
            HttpMethod.Post,
            $"repos/{Uri.EscapeDataString(request.Owner)}/{Uri.EscapeDataString(request.Repository)}/actions/workflows/{Uri.EscapeDataString(request.WorkflowFile)}/dispatches");
        message.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        message.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        message.Content = JsonContent.Create(new { @ref = request.Ref, inputs = request.Inputs });

        try
        {
            using var response = await httpClient.SendAsync(message, cancellationToken);
            if (response.IsSuccessStatusCode)
                return new(true, null);

            var detail = await response.Content.ReadAsStringAsync(cancellationToken);
            logger.LogWarning("GitHub workflow dispatch failed with status {StatusCode}: {Detail}", response.StatusCode, detail);
            return new(false, $"GitHub rejected the workflow trigger ({(int)response.StatusCode} {response.ReasonPhrase}).");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "GitHub workflow dispatch request failed.");
            return new(false, "GitHub could not be reached while triggering the workflow.");
        }
    }
}
