using System.Security.Claims;
using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class ProjectIntegrationsControllerTests
{
    private readonly Mock<IProjectIntegrationService> _serviceMock = new();
    private readonly ProjectIntegrationsController _controller;

    public ProjectIntegrationsControllerTests()
    {
        _controller = new ProjectIntegrationsController(_serviceMock.Object);
        var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim("userId", "10"),
            new Claim(ClaimTypes.Role, "User")
        }, "mock"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = user }
        };
    }

    [Fact]
    public async Task GetIntegrations_Failure_ReturnsBadRequest()
    {
        _serviceMock.Setup(s => s.GetByProjectIdAsync("p-1", 10, false))
            .ReturnsAsync((false, "Project not found.", null));

        var result = await _controller.GetIntegrations("p-1");
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task GetIntegrations_Success_ReturnsOk()
    {
        var list = new List<ProjectIntegrationResponse>
        {
            new() { Id = 1, Name = "AWS Int", ProviderType = "aws" }
        };
        _serviceMock.Setup(s => s.GetByProjectIdAsync("p-1", 10, false))
            .ReturnsAsync((true, null, list));

        var result = await _controller.GetIntegrations("p-1");
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(list, ok.Value);
    }

    [Fact]
    public async Task CreateIntegration_InvalidModelState_ReturnsBadRequest()
    {
        _controller.ModelState.AddModelError("Name", "Name is required");
        var result = await _controller.CreateIntegration("p-1", new CreateProjectIntegrationRequest());
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateIntegration_ServiceFailure_ReturnsBadRequest()
    {
        var req = new CreateProjectIntegrationRequest { Name = "AWS", ProviderType = "aws", ProviderToken = "token" };
        _serviceMock.Setup(s => s.CreateAsync("p-1", req, 10, false))
            .ReturnsAsync((false, "Permission denied.", null));

        var result = await _controller.CreateIntegration("p-1", req);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task CreateIntegration_Success_ReturnsCreatedAtAction()
    {
        var req = new CreateProjectIntegrationRequest { Name = "AWS", ProviderType = "aws", ProviderToken = "token" };
        var created = new ProjectIntegrationResponse { Id = 10, Name = "AWS", ProviderType = "aws" };
        _serviceMock.Setup(s => s.CreateAsync("p-1", req, 10, false))
            .ReturnsAsync((true, null, created));

        var result = await _controller.CreateIntegration("p-1", req);
        var createdAction = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(created, createdAction.Value);
    }

    [Fact]
    public async Task DeleteIntegration_Failure_ReturnsBadRequest()
    {
        _serviceMock.Setup(s => s.DeleteAsync(5, 10, false))
            .ReturnsAsync((false, "Integration not found."));

        var result = await _controller.DeleteIntegration("p-1", 5);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteIntegration_Success_ReturnsNoContent()
    {
        _serviceMock.Setup(s => s.DeleteAsync(5, 10, false))
            .ReturnsAsync((true, null));

        var result = await _controller.DeleteIntegration("p-1", 5);
        Assert.IsType<NoContentResult>(result);
    }
}
