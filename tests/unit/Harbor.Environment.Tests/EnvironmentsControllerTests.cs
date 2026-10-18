using System.Security.Claims;
using Harbor.Environment.Controllers;
using Harbor.Environment.DTOs;
using Harbor.Environment.Models;
using Harbor.Environment.Responses;
using Harbor.Environment.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Environment.Tests;

public class EnvironmentsControllerTests
{
    private readonly Mock<IEnvironmentService> _environmentServiceMock;
    private readonly Mock<IEnvironmentConfigurationService> _configServiceMock;
    private readonly EnvironmentsController _controller;

    public EnvironmentsControllerTests()
    {
        _environmentServiceMock = new Mock<IEnvironmentService>();
        _configServiceMock = new Mock<IEnvironmentConfigurationService>();
        _controller = new EnvironmentsController(_environmentServiceMock.Object, _configServiceMock.Object);
    }

    private void SetUser(int? userId, string role = "User")
    {
        var claims = new List<Claim>();
        if (userId.HasValue)
        {
            claims.Add(new Claim("userId", userId.Value.ToString()));
            claims.Add(new Claim(ClaimTypes.Role, role));
        }
        var identity = new ClaimsIdentity(claims, userId.HasValue ? "TestAuth" : null);
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
    }

    [Fact]
    public async Task Create_WhenUnauthenticated_ReturnsUnauthorized()
    {
        SetUser(null);
        var result = await _controller.Create("p1", new CreateEnvironmentRequest { Name = "Staging" });
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task Create_WhenServiceFails_ReturnsProblem()
    {
        SetUser(10);
        _environmentServiceMock.Setup(s => s.CreateAsync("p1", It.IsAny<CreateEnvironmentRequest>(), 10, false))
            .ReturnsAsync((false, "Invalid environment", false, null));

        var result = await _controller.Create("p1", new CreateEnvironmentRequest { Name = "Staging" });

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, objectResult.StatusCode);
    }

    [Fact]
    public async Task Create_WhenSuccessful_ReturnsCreated()
    {
        SetUser(10);
        var responseData = new EnvironmentResponse { Id = 1, Name = "Staging" };
        _environmentServiceMock.Setup(s => s.CreateAsync("p1", It.IsAny<CreateEnvironmentRequest>(), 10, false))
            .ReturnsAsync((true, null, false, responseData));

        var result = await _controller.Create("p1", new CreateEnvironmentRequest { Name = "Staging" });

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objectResult.StatusCode);
        var apiResp = Assert.IsType<ApiResponse<EnvironmentResponse>>(objectResult.Value);
        Assert.Equal("Staging", apiResp.Data?.Name);
    }

    [Fact]
    public async Task GetByProject_WhenUnauthenticated_ReturnsUnauthorized()
    {
        SetUser(null);
        var result = await _controller.GetByProject("p1");
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetByProject_WhenSuccessful_ReturnsOkWithEnvironments()
    {
        SetUser(10);
        var list = new List<EnvironmentResponse>
        {
            new() { Id = 1, Name = "Production" },
            new() { Id = 2, Name = "Staging" }
        };
        _environmentServiceMock.Setup(s => s.GetByProjectAsync("p1", 10, false))
            .ReturnsAsync((true, null, false, list));

        var result = await _controller.GetByProject("p1");

        var okResult = Assert.IsType<OkObjectResult>(result);
        var apiResp = Assert.IsType<ApiResponse<List<EnvironmentResponse>>>(okResult.Value);
        Assert.Equal(2, apiResp.Data?.Count);
    }

    [Fact]
    public async Task Update_WhenSuccessful_ReturnsOk()
    {
        SetUser(10);
        var updated = new EnvironmentResponse { Id = 1, Name = "Production" };
        _environmentServiceMock.Setup(s => s.UpdateAsync("p1", 1, It.IsAny<UpdateEnvironmentRequest>(), 10, false))
            .ReturnsAsync((true, null, false, updated));

        var result = await _controller.Update("p1", 1, new UpdateEnvironmentRequest());

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Remove_WhenSuccessful_ReturnsOk()
    {
        SetUser(10);
        var removalResp = new EnvironmentRemovalResponse { Deactivated = true, Message = "Deactivated" };
        _environmentServiceMock.Setup(s => s.RemoveAsync("p1", 1, 10, false))
            .ReturnsAsync((true, null, false, removalResp));

        var result = await _controller.Remove("p1", 1);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetConfiguration_WhenSuccessful_ReturnsOk()
    {
        SetUser(10);
        var configResp = new EnvironmentConfigurationResponse { EnvironmentId = 1, DeploymentUrl = "https://app.com" };
        _configServiceMock.Setup(s => s.GetAsync("p1", 1, 10, false))
            .ReturnsAsync((true, null, false, configResp));

        var result = await _controller.GetConfiguration("p1", 1);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task Configure_WhenSuccessful_ReturnsOk()
    {
        SetUser(10);
        var configResp = new EnvironmentConfigurationResponse { EnvironmentId = 1, DeploymentUrl = "https://app.com" };
        _configServiceMock.Setup(s => s.ConfigureAsync("p1", 1, It.IsAny<ConfigureEnvironmentRequest>(), 10, false))
            .ReturnsAsync((true, null, false, configResp));

        var result = await _controller.Configure("p1", 1, new ConfigureEnvironmentRequest());

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }
}
