using System.Text.RegularExpressions;

namespace Harbor.Deployment.Services;

internal static partial class DeploymentLogSanitizer
{
    private static readonly Regex BearerCredential = new(
        @"(?i)(\bauthorization\s*:\s*bearer\s+)\S+",
        RegexOptions.Compiled);

    private static readonly Regex QuotedSensitiveSetting = new(
        @"(?i)(?<![A-Za-z0-9])([""'])([A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|client[_-]?secret|access[_-]?key|private[_-]?key|authorization)[A-Za-z0-9_.-]*)\1(\s*[:=]\s*)([""'])(?:\\.|(?!\4).)*\4",
        RegexOptions.Compiled);

    private static readonly Regex SensitiveSetting = new(
        @"(?i)(?<![A-Za-z0-9])([A-Za-z0-9_.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|client[_-]?secret|access[_-]?key|private[_-]?key|authorization)[A-Za-z0-9_.-]*)(\s*[:=]\s*)(?:""[^""]*""|'[^']*'|[^\s,;]+)",
        RegexOptions.Compiled);

    public static string Sanitize(string? text)
    {
        if (string.IsNullOrEmpty(text)) return text ?? string.Empty;

        var sanitized = BearerCredential.Replace(text, "$1[REDACTED]");
        sanitized = QuotedSensitiveSetting.Replace(sanitized, "$1$2$1$3$4[REDACTED]$4");
        return SensitiveSetting.Replace(sanitized, "$1$2[REDACTED]");
    }
}