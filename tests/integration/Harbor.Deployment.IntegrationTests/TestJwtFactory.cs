using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Harbor.Deployment.IntegrationTests;

/// <summary>
/// Issues JWTs signed with the same test key the API is configured to trust
/// (see <see cref="DeploymentApiFactory"/>), so tests can simulate a real
/// logged-in user exactly as Harbor.Authentication would produce, without
/// running that service.
/// </summary>
public static class TestJwtFactory
{
    public static string CreateToken(int userId, string role = "User")
    {
        var claims = new[]
        {
            new Claim("userId", userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };

        var key         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(DeploymentApiFactory.JwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:             DeploymentApiFactory.JwtIssuer,
            audience:           DeploymentApiFactory.JwtAudience,
            claims:             claims,
            expires:            DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
