using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.DTOs;

namespace Harbor.Project.Services
{
    public interface IServiceDomainService
    {
        Task<List<ServiceDomainResponse>> GetDomainsAsync(int serviceId);
        Task<(bool Success, string? Error, ServiceDomainResponse? Domain)> AddDomainAsync(int serviceId, CreateServiceDomainRequest request);
        Task<bool> DeleteDomainAsync(int serviceId, int domainId);
        Task<bool> SetPrimaryAsync(int serviceId, int domainId);
        Task<(bool Success, string Status)> VerifyDomainAsync(int serviceId, int domainId);
    }
}
