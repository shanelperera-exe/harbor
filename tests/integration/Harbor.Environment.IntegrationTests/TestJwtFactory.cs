using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Harbor.Environment.IntegrationTests;

public static class TestJwtFactory
{
    public static string CreateToken(int userId, string role = "User")
    {
        var token = new JwtSecurityToken(EnvironmentApiFactory.JwtIssuer, EnvironmentApiFactory.JwtAudience,
            [new Claim("userId", userId.ToString()), new Claim(ClaimTypes.Role, role)],
            expires: DateTime.UtcNow.AddMinutes(30),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(EnvironmentApiFactory.JwtSecret)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
