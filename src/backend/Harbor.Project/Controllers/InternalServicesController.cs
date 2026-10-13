using Microsoft.AspNetCore.Mvc;
using Harbor.Project.Services;
using Harbor.Project.Responses;
using Harbor.Project.DTOs;
using System.Threading.Tasks;

namespace Harbor.Project.Controllers
{
    [ApiController]
    [Route("api/internal/services")]
    public class InternalServicesController : ControllerBase
    {
        private readonly IServiceService _serviceService;

        public InternalServicesController(IServiceService serviceService)
        {
            _serviceService = serviceService;
        }

        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ApiResponse<ServiceResponse>), 200)]
        [ProducesResponseType(404)]
        public async Task<IActionResult> GetById(string id)
        {
            // Internal endpoint without auth for other microservices to fetch service details
            // We use the admin flag = true to bypass owner check
            var (success, error, data) = await _serviceService.GetByIdAsync(id, 0, true);

            if (!success || data == null)
            {
                return NotFound(new { error = error ?? "Service not found." });
            }

            return Ok(new ApiResponse<ServiceResponse> { Data = data });
        }
    }
}
