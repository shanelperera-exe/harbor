using Xunit;
using Microsoft.Extensions.Configuration;
using Harbor.Authentication.Models;
using Harbor.Authentication.Services;

namespace Harbor.Authentication.Tests
{
    public class JwtServiceTests
    {
        private IConfiguration GetTestConfiguration()
        {
            Environment.SetEnvironmentVariable("JWT_SECRET", "test-secret-key-thats-long-enough-for-hmac");
            Environment.SetEnvironmentVariable("JWT_ISSUER", "TestIssuer");
            Environment.SetEnvironmentVariable("JWT_AUDIENCE", "TestAudience");
            return new ConfigurationBuilder().Build();
        }

        [Fact]
        public void GenerateToken_IncludesRoleClaim()
        {
            var configuration = GetTestConfiguration();
            var jwtService = new JwtService(configuration);
            var user = new User { Id = 1, Username = "puna", Role = "Admin" };

            var (token, _) = jwtService.GenerateToken(user);

            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            Assert.Contains(jwt.Claims, c => c.Type == System.Security.Claims.ClaimTypes.Role && c.Value == "Admin");
        }

        [Fact]
        public void GenerateToken_IncludesUsernameClaim()
        {
            var configuration = GetTestConfiguration();
            var jwtService = new JwtService(configuration);
            var user = new User { Id = 1, Username = "puna", Role = "Developer" };

            var (token, _) = jwtService.GenerateToken(user);

            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwt = handler.ReadJwtToken(token);

            Assert.Contains(jwt.Claims, c => c.Type == System.Security.Claims.ClaimTypes.Name && c.Value == "puna");
        }

        [Fact]
        public void GenerateToken_SetsExpiryInTheFuture()
        {
            var configuration = GetTestConfiguration();
            var jwtService = new JwtService(configuration);
            var user = new User { Id = 1, Username = "puna", Role = "Developer" };

            var (_, expiresAt) = jwtService.GenerateToken(user);

            Assert.True(expiresAt > DateTime.UtcNow);
        }
    }
}
