using System.Text.RegularExpressions;

namespace Harbor.Deployment.Services;

/// <summary>
/// Extracts cloud provider deployment URLs from build and deployment logs.
/// Supports Vercel, Render, AWS, GCP, Azure, DigitalOcean, and standard deployment markers.
/// </summary>
public static class DeploymentUrlExtractor
{
    private static readonly TimeSpan PatternTimeout = TimeSpan.FromSeconds(1);

    private static readonly Regex[] ProviderUrlPatterns = new[]
    {
        // Vercel deployment URL
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.vercel\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // Render
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.onrender\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // GCP Cloud Run & Firebase
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.a\.run\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.web\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // AWS App Runner, CloudFront, Amplify, Lambda URL
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.awsapprunner\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.cloudfront\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.amplifyapp\.com", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.lambda-url\.[a-z0-9\-]+\.on\.aws", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // Azure Websites, Static Apps, Container Apps
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurewebsites\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurestaticapps\.net", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.azurecontainerapps\.io", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // DigitalOcean App Platform
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.ondigitalocean\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // Railway
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.up\.railway\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),
        new Regex(@"https://[a-zA-Z0-9_\-\.]+\.railway\.app", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout),

        // Generic explicit outputs like "Production: https://..." or "Deployed to: https://..."
        new Regex(@"(?:Production|Deployed to|Deployment URL|Endpoint|URL):\s*(https?://[^\s\x1b\]\>]+)", RegexOptions.Compiled | RegexOptions.IgnoreCase, PatternTimeout)
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
