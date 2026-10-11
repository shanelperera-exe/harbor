using System;

namespace Harbor.Project.Models
{
    public class ServiceDomainEntity
    {
        public int Id { get; set; }
        public int ServiceId { get; set; }
        public string Domain { get; set; } = string.Empty;
        public string Environment { get; set; } = "Production";
        public bool IsPrimary { get; set; }
        public bool IsSystem { get; set; }
        public string Status { get; set; } = "Pending";
        public string DnsType { get; set; } = "CNAME";
        public string DnsHost { get; set; } = "@";
        public string DnsTarget { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? VerifiedAt { get; set; }
    }
}
