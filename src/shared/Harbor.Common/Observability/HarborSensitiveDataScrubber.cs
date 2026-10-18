#nullable enable
using System;
using System.Text.RegularExpressions;

namespace Harbor.Common.Observability;

/// <summary>
/// Provides automated sanitization and redaction for sensitive credentials,
/// tokens, passwords, and cryptographic keys before they are emitted into logs.
/// Scenario 4: Sensitive Information Protection.
/// </summary>
public static class HarborSensitiveDataScrubber
{
    public const string RedactedReplacement = "[REDACTED]";

    private static readonly TimeSpan ScrubTimeout = TimeSpan.FromSeconds(1);

    // Regex 1: Password/Secret assignments in key-value pairs or query strings (e.g. password=xyz, pwd=xyz, secret=xyz)
    private static readonly Regex PasswordKeyValueRegex = new(
        @"(?i)(?<prefix>\b(password|pwd|client_secret|secret|access_token|refresh_token|auth_token)\s*[:=]\s*[""']?)(?<secret>[^""',;\s]+)(?<suffix>[""']?)",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 2: JSON properties (e.g. "password": "xyz", "clientSecret": "xyz")
    private static readonly Regex JsonSensitivePropertyRegex = new(
        @"(?i)(?<prefix>""(password|pwd|client_secret|clientSecret|secret|accessToken|access_token|refreshToken|refresh_token|jwt|token|apiKey|api_key)""\s*:\s*[""'])(?<secret>[^""']+)(?<suffix>[""'])",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 3: Bearer tokens and JWTs (e.g. Bearer eyJhbGci...)
    private static readonly Regex BearerJwtRegex = new(
        @"(?i)(?<prefix>\bBearer\s+)ey[A-Za-z0-9_-]+\.[A-Za-z0-9._-]+\.[A-Za-z0-9._-]+",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 4: Standalone JWT token strings
    private static readonly Regex StandaloneJwtRegex = new(
        @"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\b",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 5: GitHub Personal Access Tokens and App Tokens (ghp_..., github_pat_...)
    private static readonly Regex GitHubTokenRegex = new(
        @"\b(ghp_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{80,}|ghs_[A-Za-z0-9]{36,}|gho_[A-Za-z0-9]{36,})\b",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 6: Database connection string credentials with User Id, SharedAccessKey, AccountKey
    private static readonly Regex ConnectionStringCredentialsRegex = new(
        @"(?i)(?<prefix>\b(User\s*Id|SharedAccessKey|AccountKey)\s*=\s*[""']?)(?<secret>[^""';\r\n]+?)(?<suffix>\s*;|[""']?\s*;|[""']?$)",
        RegexOptions.Compiled,
        ScrubTimeout);

    // Regex 7: AES Environment encryption key (ENVIRONMENT_SECRETS_KEY=...)
    private static readonly Regex EnvironmentSecretsKeyRegex = new(
        @"(?i)(?<prefix>\bENVIRONMENT_SECRETS_KEY\s*[:=]\s*[""']?)(?<secret>[^""';\s]+)(?<suffix>[""']?)",
        RegexOptions.Compiled,
        ScrubTimeout);

    /// <summary>
    /// Scrubs all sensitive information (passwords, JWTs, tokens, keys) from an input string.
    /// </summary>
    public static string Scrub(string? input)
    {
        if (string.IsNullOrEmpty(input))
        {
            return string.Empty;
        }

        var result = input;

        // 1. Scrub Connection Strings
        result = ConnectionStringCredentialsRegex.Replace(result, $"${{prefix}}{RedactedReplacement}${{suffix}}");

        // 2. Scrub Environment Secrets Key
        result = EnvironmentSecretsKeyRegex.Replace(result, $"${{prefix}}{RedactedReplacement}${{suffix}}");

        // 3. Scrub GitHub Tokens
        result = GitHubTokenRegex.Replace(result, RedactedReplacement);

        // 4. Scrub Bearer JWT headers
        result = BearerJwtRegex.Replace(result, $"${{prefix}}{RedactedReplacement}");

        // 5. Scrub standalone JWTs
        result = StandaloneJwtRegex.Replace(result, RedactedReplacement);

        // 6. Scrub JSON properties
        result = JsonSensitivePropertyRegex.Replace(result, $"${{prefix}}{RedactedReplacement}${{suffix}}");

        // 7. Scrub Key-Value secrets
        result = PasswordKeyValueRegex.Replace(result, $"${{prefix}}{RedactedReplacement}${{suffix}}");

        return result;
    }
}
