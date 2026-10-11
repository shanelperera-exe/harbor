using System;
using System.ComponentModel.DataAnnotations;

namespace Harbor.Project.DTOs
{
    public class CreateServiceDomainRequest
    {
        [Required]
        [MaxLength(255)]
        public string Domain { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Environment { get; set; } = "Production";
    }

    public class ServiceDomainResponse
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
