using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.Repositories;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/internal/users")]
    public class InternalController : ControllerBase
    {
        private readonly IUserRepository _userRepository;

        public InternalController(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        [HttpGet("{userId}/tokens/{provider}")]
        public async Task<IActionResult> GetExternalToken(int userId, string provider)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            // Needs a new method in repository to get token
            var token = await _userRepository.GetExternalAccessTokenAsync(userId, provider);
            if (string.IsNullOrWhiteSpace(token)) return NotFound();

            return Ok(new { Token = token });
        }
    }
}
