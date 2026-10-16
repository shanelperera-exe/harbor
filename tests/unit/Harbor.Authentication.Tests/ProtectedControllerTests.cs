using System.Security.Claims;
using Harbor.Authentication.Controllers;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Responses;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace Harbor.Authentication.Tests;

public class ProtectedControllerTests
{
    private readonly ProtectedController _controller = new();

    private void SetUser(string? username, string? role = null)
    {
        var claims = new List<Claim>();
        if (username != null)
            claims.Add(new Claim(ClaimTypes.Name, username));
        if (role != null)
            claims.Add(new Claim(ClaimTypes.Role, role));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }

    [Fact]
    public void Ping_AuthenticatedUser_ReturnsGreeting()
    {
        SetUser("testuser");

        var result = _controller.Ping();

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ApiResponse<MessageResponse>>(ok.Value);
        Assert.Contains("testuser", response.Data.Message);
    }

    [Fact]
    public void AdminOnly_ReturnsAdminMessage()
    {
        SetUser("admin", "Admin");

        var result = _controller.AdminOnly();

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ApiResponse<MessageResponse>>(ok.Value);
        Assert.Contains("Admin", response.Data.Message);
    }

    [Fact]
    public void DeveloperArea_ReturnsDeveloperMessage()
    {
        SetUser("developer", "User");

        var result = _controller.DeveloperArea();

        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ApiResponse<MessageResponse>>(ok.Value);
        Assert.Contains("User", response.Data.Message);
    }
}
