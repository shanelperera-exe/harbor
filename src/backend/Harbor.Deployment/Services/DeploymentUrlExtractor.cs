using System.Text.RegularExpressions;

namespace Harbor.Deployment.Services;

/// <summary>
/// Extracts cloud provider deployment URLs from build and deployment logs.
/// Supports Vercel, Render, AWS, GCP, Azure, DigitalOcean, and standard deployment markers.
/// </summary>
public static class DeploymentUrlExtractor
{
    private static readonly Regex[] ProviderUrlPatterns = new[]
    {
        // Vercel deployment URL
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.vercel\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // Render
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.onrender\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // GCP Cloud Run & Firebase
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.a\.run\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.web\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // AWS App Runner, CloudFront, Amplify, Lambda URL
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.awsapprunner\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.cloudfront\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.amplifyapp\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.lambda-url\.[a-z0-9\-]+\.on\.aws", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // Azure Websites, Static Apps, Container Apps
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurewebsites\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurestaticapps\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurecontainerapps\.io", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // DigitalOcean App Platform
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.ondigitalocean\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // Railway
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.up\.railway\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.railway\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase),

        // Generic explicit outputs like "Production: https://..." or "Deployed to: https://..."
        new Regex(@"(?:Production|Deployed to|Deployment URL|Endpoint|URL):\s*(https?://[^\s\x1b\]\>]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase)
    };

    public static string? ExtractUrl(string? logText)
    {
        if (string.IsNullOrWhiteSpace(logText))
            return null;

        foreach (var pattern in ProviderUrlPatterns)
        {
            var match = pattern.Match(logText);
            if (match.Success)
            {
                var url = match.Groups.Count > 1 && match.Groups[1].Success 
                    ? match.Groups[1].Value 
                    : match.Value;

                url = url.Trim().TrimEnd('.', ',', ';', '"', '\'');
                if (Uri.TryCreate(url, UriKind.Absolute, out var parsed) && 
                    (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps))
                {
                    return parsed.ToString().TrimEnd('/');
                }
            }
        }

        return null;
    }
}
