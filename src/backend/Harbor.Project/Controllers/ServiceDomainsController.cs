using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Responses;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/projects/{projectId}/services/{serviceId}/domains")]
    [Authorize]
    public class ServiceDomainsController : ControllerBase
    {
        private readonly IServiceDomainService _domainService;
        private readonly IServiceService _serviceService;

        public ServiceDomainsController(
            IServiceDomainService domainService,
            IServiceService serviceService)
        {
            _domainService = domainService;
            _serviceService = serviceService;
        }

        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<ServiceDomainResponse>>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetDomains(string projectId, string serviceId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, _, service) = await _serviceService.GetByIdAsync(serviceId, userId.Value, isAdmin);
            if (!success || service == null)
                return NotFound(new { error = "Service not found." });

            var domains = await _domainService.GetDomainsAsync(service.Id);
            return Ok(new ApiResponse<List<ServiceDomainResponse>> { Data = domains });
        }

        [HttpPost]
        [ProducesResponseType(typeof(ApiResponse<ServiceDomainResponse>), StatusCodes.Status201Created)]
        public async Task<IActionResult> AddDomain(string projectId, string serviceId, [FromBody] CreateServiceDomainRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, _, service) = await _serviceService.GetByIdAsync(serviceId, userId.Value, isAdmin);
            if (!success || service == null)
                return NotFound(new { error = "Service not found." });

            var (added, error, domain) = await _domainService.AddDomainAsync(service.Id, request);
            if (!added)
                return BadRequest(new { error });

            return StatusCode(201, new ApiResponse<ServiceDomainResponse> { Data = domain });
        }

        [HttpDelete("{domainId:int}")]
        public async Task<IActionResult> DeleteDomain(string projectId, string serviceId, int domainId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, _, service) = await _serviceService.GetByIdAsync(serviceId, userId.Value, isAdmin);
            if (!success || service == null)
                return NotFound(new { error = "Service not found." });

            var deleted = await _domainService.DeleteDomainAsync(service.Id, domainId);
            if (!deleted)
                return BadRequest(new { error = "Failed to remove domain or domain not found." });

            return NoContent();
        }

        [HttpPost("{domainId:int}/verify")]
        public async Task<IActionResult> VerifyDomain(string projectId, string serviceId, int domainId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, _, service) = await _serviceService.GetByIdAsync(serviceId, userId.Value, isAdmin);
            if (!success || service == null)
                return NotFound(new { error = "Service not found." });

            var (verified, status) = await _domainService.VerifyDomainAsync(service.Id, domainId);
            return Ok(new ApiResponse<object> { Data = new { verified, status } });
        }

        [HttpPatch("{domainId:int}/primary")]
        public async Task<IActionResult> SetPrimary(string projectId, string serviceId, int domainId)
        {
            var userId = GetUserId();
            if (userId is null) return Unauthorized();

            var isAdmin = User.IsInRole(Roles.Admin);
            var (success, _, service) = await _serviceService.GetByIdAsync(serviceId, userId.Value, isAdmin);
            if (!success || service == null)
                return NotFound(new { error = "Service not found." });

            var updated = await _domainService.SetPrimaryAsync(service.Id, domainId);
            if (!updated)
                return BadRequest(new { error = "Failed to set domain as primary." });

            return Ok(new ApiResponse<object> { Data = new { success = true } });
        }

        private int? GetUserId()
        {
            var claim = User.FindFirst("userId")?.Value;
            return int.TryParse(claim, out var id) ? id : null;
        }
    }
}
