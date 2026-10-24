using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Microsoft.Extensions.Logging;

namespace Harbor.Project.Services
{
    public class ServiceDomainService : IServiceDomainService
    {
        private readonly IServiceDomainRepository _domainRepo;
        private readonly IServiceRepository _serviceRepo;
        private readonly ILogger<ServiceDomainService> _logger;

        private static readonly Regex DomainRegex = new(
            @"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase,
            TimeSpan.FromSeconds(1));

        private static readonly string DefaultApexDnsTarget = Environment.GetEnvironmentVariable("HARBOR_APEX_IP") ?? string.Join(".", 76, 76, 21, 21);

        public ServiceDomainService(
            IServiceDomainRepository domainRepo,
            IServiceRepository serviceRepo,
            ILogger<ServiceDomainService> logger)
        {
            _domainRepo = domainRepo;
            _serviceRepo = serviceRepo;
            _logger = logger;
        }

        public async Task<List<ServiceDomainResponse>> GetDomainsAsync(int serviceId)
        {
            var domains = await _domainRepo.GetByServiceIdAsync(serviceId);
            var service = await _serviceRepo.GetByIdAsync(serviceId);

            // If the service has a DeploymentUrl and no system domain exists yet, auto-create one
            if (service != null && !string.IsNullOrWhiteSpace(service.DeploymentUrl) && !service.DeploymentUrl.Trim().StartsWith("["))
            {
                var cleanUrl = service.DeploymentUrl.Trim();
                var host = CleanHost(cleanUrl);
                if (!string.IsNullOrWhiteSpace(host) && !domains.Any(d => d.Domain.Equals(host, StringComparison.OrdinalIgnoreCase)))
                {
                    var systemDomain = new ServiceDomainEntity
                    {
                        ServiceId = serviceId,
                        Domain = host,
                        Environment = "Production",
                        IsPrimary = !domains.Any(d => d.IsPrimary),
                        IsSystem = true,
                        Status = "Active",
                        DnsType = "CNAME",
                        DnsHost = "@",
                        DnsTarget = host,
                        CreatedAt = DateTime.UtcNow,
                        VerifiedAt = DateTime.UtcNow
                    };
                    await _domainRepo.CreateAsync(systemDomain);
                    domains = await _domainRepo.GetByServiceIdAsync(serviceId);
                }
            }

            return domains.Select(MapToResponse).ToList();
        }

        public async Task<(bool Success, string? Error, ServiceDomainResponse? Domain)> AddDomainAsync(int serviceId, CreateServiceDomainRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Domain))
                return (false, "Domain name is required.", null);

            var domainName = CleanHost(request.Domain).ToLowerInvariant();
            if (!DomainRegex.IsMatch(domainName))
                return (false, "Invalid domain format. Enter a valid domain name (e.g. app.example.com).", null);

            var existing = await _domainRepo.GetByDomainAsync(serviceId, domainName);
            if (existing != null)
                return (false, "This domain is already registered for this service.", null);

            var service = await _serviceRepo.GetByIdAsync(serviceId);
            if (service == null)
                return (false, "Service not found.", null);

            var currentDomains = await _domainRepo.GetByServiceIdAsync(serviceId);
            var isFirstCustom = !currentDomains.Any(d => !d.IsSystem);

            // Determine DNS target based on provider or default
            var parts = domainName.Split('.');
            bool isApex = parts.Length == 2;
            string dnsType = isApex ? "A" : "CNAME";
            string dnsHost = isApex ? "@" : parts[0];
            string dnsTarget = isApex
                ? DefaultApexDnsTarget
                : (service.Provider?.ToLower() == "vercel"
                    ? "cname.vercel-dns.com"
                    : (service.Provider?.ToLower() == "railway"
                        ? (!string.IsNullOrWhiteSpace(service.DeploymentUrl) && CleanHost(service.DeploymentUrl).EndsWith(".up.railway.app", StringComparison.OrdinalIgnoreCase)
                            ? CleanHost(service.DeploymentUrl)
                            : "dns.railway.app")
                        : "cname.harbor.app"));

            var entity = new ServiceDomainEntity
            {
                ServiceId = serviceId,
                Domain = domainName,
                Environment = string.IsNullOrWhiteSpace(request.Environment) ? "Production" : request.Environment.Trim(),
                IsPrimary = isFirstCustom,
                IsSystem = false,
                Status = "Pending",
                DnsType = dnsType,
                DnsHost = dnsHost,
                DnsTarget = dnsTarget,
                CreatedAt = DateTime.UtcNow
            };

            var id = await _domainRepo.CreateAsync(entity);
            entity.Id = id;

            return (true, null, MapToResponse(entity));
        }

        public async Task<bool> DeleteDomainAsync(int serviceId, int domainId)
        {
            var domain = await _domainRepo.GetByIdAsync(domainId);
            if (domain == null || domain.ServiceId != serviceId)
                return false;

            return await _domainRepo.DeleteAsync(domainId);
        }

        public async Task<bool> SetPrimaryAsync(int serviceId, int domainId)
        {
            var domain = await _domainRepo.GetByIdAsync(domainId);
            if (domain == null || domain.ServiceId != serviceId)
                return false;

            return await _domainRepo.SetPrimaryAsync(serviceId, domainId);
        }

        public async Task<(bool Success, string Status)> VerifyDomainAsync(int serviceId, int domainId)
        {
            var domain = await _domainRepo.GetByIdAsync(domainId);
            if (domain == null || domain.ServiceId != serviceId)
                return (false, "Domain not found.");

            try
            {
                var addresses = await Dns.GetHostAddressesAsync(domain.Domain);
                if (addresses.Length > 0)
                {
                    await _domainRepo.UpdateStatusAsync(domainId, "Active", DateTime.UtcNow);
                    return (true, "Active");
                }
            }
            catch (Exception ex)
            {
                _logger.LogInformation("DNS resolution failed for domain {Domain}: {Message}", domain.Domain, ex.Message);
            }

            return (false, "Pending");
        }

        private static string CleanHost(string input)
        {
            var cleaned = input.Trim();
            if (cleaned.StartsWith("http://", StringComparison.OrdinalIgnoreCase))
                cleaned = cleaned.Substring(7);
            else if (cleaned.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                cleaned = cleaned.Substring(8);

            var slashIdx = cleaned.IndexOf('/');
            if (slashIdx >= 0)
                cleaned = cleaned.Substring(0, slashIdx);

            return cleaned.Trim().TrimEnd('.');
        }

        private static ServiceDomainResponse MapToResponse(ServiceDomainEntity entity) => new()
        {
            Id = entity.Id,
            ServiceId = entity.ServiceId,
            Domain = entity.Domain,
            Environment = entity.Environment,
            IsPrimary = entity.IsPrimary,
            IsSystem = entity.IsSystem,
            Status = entity.Status,
            DnsType = entity.DnsType,
            DnsHost = entity.DnsHost,
            DnsTarget = entity.DnsTarget,
            CreatedAt = entity.CreatedAt,
            VerifiedAt = entity.VerifiedAt
        };
    }
}
