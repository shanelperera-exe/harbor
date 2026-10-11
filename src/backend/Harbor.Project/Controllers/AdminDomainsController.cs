using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/projects/admin/domains")]
    public class AdminDomainsController : ControllerBase
    {
        private readonly IServiceDomainRepository _domainRepository;
        private readonly ILogger<AdminDomainsController> _logger;

        public AdminDomainsController(
            IServiceDomainRepository domainRepository,
            ILogger<AdminDomainsController> logger)
        {
            _domainRepository = domainRepository;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllDomains()
        {
            try
            {
                var domains = await _domainRepository.GetAllAdminDomainsAsync();
                return Ok(domains);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve admin domains");
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to retrieve platform domains" });
            }
        }

        [HttpPost("{domainId}/verify")]
        public async Task<IActionResult> VerifyDomain(string domainId)
        {
            if (!int.TryParse(domainId, out var id))
            {
                return BadRequest(new { error = "Invalid domain ID" });
            }

            try
            {
                var domain = await _domainRepository.GetByIdAsync(id);
                if (domain == null)
                {
                    return NotFound(new { error = "Domain not found" });
                }

                await _domainRepository.UpdateStatusAsync(id, "Active", DateTime.UtcNow);

                var all = await _domainRepository.GetAllAdminDomainsAsync();
                var updated = all.Find(d => d.Id == domainId);
                return Ok(updated ?? new AdminDomainDto
                {
                    Id = domainId,
                    DomainName = domain.Domain,
                    SslStatus = "issued",
                    DnsStatus = "verified",
                    LastChecked = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to verify domain {DomainId}", domainId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to verify domain" });
            }
        }

        [HttpDelete("{domainId}")]
        public async Task<IActionResult> DeleteDomain(string domainId)
        {
            if (!int.TryParse(domainId, out var id))
            {
                return BadRequest(new { error = "Invalid domain ID" });
            }

            try
            {
                var success = await _domainRepository.DeleteAsync(id);
                if (!success)
                {
                    return NotFound(new { error = "Domain not found or already deleted" });
                }

                return Ok(new { success = true, id = domainId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to revoke domain {DomainId}", domainId);
                return StatusCode(StatusCodes.Status500InternalServerError, new { error = "Failed to revoke domain" });
            }
        }
    }
}
