using System;

namespace Harbor.Project.DTOs
{
    public class AdminDomainDto
    {
        public string Id { get; set; } = string.Empty;
        public string DomainName { get; set; } = string.Empty;
        public string ProjectName { get; set; } = string.Empty;
        public int ProjectId { get; set; }
        public string ServiceName { get; set; } = string.Empty;
        public int ServiceId { get; set; }
        public string Environment { get; set; } = string.Empty;
        public string SslStatus { get; set; } = "issued";
        public string DnsStatus { get; set; } = "verified";
        public string CnameTarget { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastChecked { get; set; }
    }
}
