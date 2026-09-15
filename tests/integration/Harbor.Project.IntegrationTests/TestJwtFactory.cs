using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Harbor.Project.IntegrationTests
{
    /// <summary>
    /// Issues JWTs signed with the same test key the API is configured to trust
    /// (see ProjectApiFactory), so tests can simulate a real logged-in user
    /// exactly as Harbor.Authentication would produce, without running that service.
    /// </summary>
    public static class TestJwtFactory
    {
        public static string CreateToken(int userId, string role)
        {
            var claims = new[]
            {
                new Claim("userId", userId.ToString()),
                new Claim(ClaimTypes.Role, role)
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(ProjectApiFactory.JwtSecret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: ProjectApiFactory.JwtIssuer,
                audience: ProjectApiFactory.JwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(30),
                signingCredentials: credentials);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
