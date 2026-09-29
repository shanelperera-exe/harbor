using Microsoft.AspNetCore.Mvc;
using Harbor.Authentication.Repositories;
using Harbor.Authentication.Services;
using Harbor.GitHub;
using Harbor.GitHub.Services;
using Microsoft.Extensions.Options;

namespace Harbor.Authentication.Controllers
{
    [ApiController]
    [Route("api/internal/users")]
    public class InternalController : ControllerBase
    {
        private readonly IUserRepository _userRepository;
        private readonly IEncryptionService _encryptionService;
        private readonly IGitHubAppInstallationProvider _installationProvider;
        private readonly GitHubAppOptions _appOptions;

        public InternalController(
            IUserRepository userRepository,
            IEncryptionService encryptionService,
            IGitHubAppInstallationProvider installationProvider,
            IOptions<GitHubAppOptions> appOptions)
        {
            _userRepository = userRepository;
            _encryptionService = encryptionService;
            _installationProvider = installationProvider;
            _appOptions = appOptions.Value;
        }

        [HttpGet("{userId}/tokens/{provider}")]
        public async Task<IActionResult> GetExternalToken(int userId, string provider)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null) return NotFound();

            var token = await _userRepository.GetExternalAccessTokenAsync(userId, provider);
            if (string.IsNullOrWhiteSpace(token)) return NotFound();

            // GitHub App tokens are encrypted at rest; decrypt before returning
            // to trusted Harbor services. Google OAuth tokens are stored as plaintext.
            if (provider.Equals("github", StringComparison.OrdinalIgnoreCase) && _appOptions.AppId > 0)
            {
                token = _encryptionService.Decrypt(token);
            }

            return Ok(new { Token = token });
        }

        [HttpGet("{userId}/installation-token")]
        public async Task<IActionResult> GetInstallationToken(int userId)
        {
            var installationId = await _userRepository.GetGitHubInstallationAsync(userId);
            if (!installationId.HasValue)
                return NotFound(new { message = "No GitHub App installation found for this user." });

            try
            {
                var token = await _installationProvider.GetInstallationTokenAsync(installationId.Value);
                return Ok(new { Token = token.Token, ExpiresAt = token.ExpiresAt });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Failed to create installation token: {ex.Message}" });
            }
        }

        [HttpGet("{userId}/installations")]
        public async Task<IActionResult> GetUserInstallations(int userId)
        {
            var accessToken = await _userRepository.GetExternalAccessTokenAsync(userId, "github");
            if (string.IsNullOrWhiteSpace(accessToken))
                return NotFound(new { message = "GitHub account not connected." });

            var decrypted = _encryptionService.Decrypt(accessToken);
            var installations = await _installationProvider.GetUserInstallationsDetailAsync(decrypted);

            return Ok(new
            {
                Data = installations.Select(i => new
                {
                    InstallationId = i.InstallationId,
                    AccountLogin = i.AccountLogin,
                    AccountType = i.AccountType,
                    HtmlUrl = i.HtmlUrl
                })
            });
        }
    }
}
