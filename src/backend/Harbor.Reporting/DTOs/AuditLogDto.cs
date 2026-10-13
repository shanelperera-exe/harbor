using System;

namespace Harbor.Reporting.DTOs;

public class AuditLogDto
{
    public string Id { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Severity { get; set; } = "info";
    public string? Details { get; set; }
}
