using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.Models;

namespace Harbor.Project.Repositories
{
    public interface IServiceDomainRepository
    {
        Task<List<ServiceDomainEntity>> GetByServiceIdAsync(int serviceId);
        Task<ServiceDomainEntity?> GetByIdAsync(int id);
        Task<ServiceDomainEntity?> GetByDomainAsync(int serviceId, string domain);
        Task<int> CreateAsync(ServiceDomainEntity domain);
        Task<bool> DeleteAsync(int id);
        Task<bool> SetPrimaryAsync(int serviceId, int domainId);
        Task<bool> UpdateStatusAsync(int id, string status, DateTime? verifiedAt);
        Task<List<Harbor.Project.DTOs.AdminDomainDto>> GetAllAdminDomainsAsync();
    }
}
