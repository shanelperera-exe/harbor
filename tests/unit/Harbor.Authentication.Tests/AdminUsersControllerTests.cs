using Harbor.Authentication.Controllers;
using Harbor.Authentication.DTOs;
using Harbor.Authentication.Models;
using Harbor.Authentication.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Authentication.Tests;

public class AdminUsersControllerTests
{
    private readonly Mock<IUserRepository> _repoMock = new();
    private readonly Mock<ILogger<AdminUsersController>> _loggerMock = new();
    private readonly AdminUsersController _controller;

    public AdminUsersControllerTests()
    {
        _controller = new AdminUsersController(_repoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetAllUsers_Success_ReturnsOk()
    {
        var users = new List<AdminUserDto> { new() { Id = 1, Username = "admin" } };
        _repoMock.Setup(r => r.GetAllUsersAsync()).ReturnsAsync(users);

        var result = await _controller.GetAllUsers();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(users, ok.Value);
    }

    [Fact]
    public async Task GetAllUsers_Exception_Returns500()
    {
        _repoMock.Setup(r => r.GetAllUsersAsync()).ThrowsAsync(new Exception("DB Down"));

        var result = await _controller.GetAllUsers();

        var status = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, status.StatusCode);
    }

    [Fact]
    public async Task UpdateRole_EmptyRole_ReturnsBadRequest()
    {
        var result = await _controller.UpdateRole(1, new UpdateRoleRequest { Role = " " });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateRole_NotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.UpdateUserRoleAsync(1, "Admin")).ReturnsAsync(false);

        var result = await _controller.UpdateRole(1, new UpdateRoleRequest { Role = "Admin" });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task UpdateRole_Success_ReturnsOk()
    {
        _repoMock.Setup(r => r.UpdateUserRoleAsync(1, "Admin")).ReturnsAsync(true);

        var result = await _controller.UpdateRole(1, new UpdateRoleRequest { Role = "Admin" });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task UpdateStatus_EmptyStatus_ReturnsBadRequest()
    {
        var result = await _controller.UpdateStatus(1, new UpdateStatusRequest { Status = "" });

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_NotFound_ReturnsNotFound()
    {
        _repoMock.Setup(r => r.UpdateUserStatusAsync(1, "active")).ReturnsAsync(false);

        var result = await _controller.UpdateStatus(1, new UpdateStatusRequest { Status = "active" });

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_Success_ReturnsOk()
    {
        _repoMock.Setup(r => r.UpdateUserStatusAsync(1, "active")).ReturnsAsync(true);

        var result = await _controller.UpdateStatus(1, new UpdateStatusRequest { Status = "Active" });

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }
}
