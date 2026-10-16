using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Responses;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class InternalServicesControllerTests
{
    private readonly Mock<IServiceService> _serviceMock = new();
    private readonly InternalServicesController _controller;

    public InternalServicesControllerTests()
    {
        _controller = new InternalServicesController(_serviceMock.Object);
    }

    [Fact]
    public async Task GetById_NotFound_ReturnsNotFound()
    {
        _serviceMock.Setup(s => s.GetByIdAsync("s-123", 0, true))
            .ReturnsAsync((false, "Service not found.", null));

        var result = await _controller.GetById("s-123");
        var notFound = Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetById_Success_ReturnsOk()
    {
        var response = new ServiceResponse { Id = 1, Name = "Auth Service", PublicId = "s-123" };
        _serviceMock.Setup(s => s.GetByIdAsync("s-123", 0, true))
            .ReturnsAsync((true, null, response));

        var result = await _controller.GetById("s-123");
        var ok = Assert.IsType<OkObjectResult>(result);
        var apiResponse = Assert.IsType<ApiResponse<ServiceResponse>>(ok.Value);
        Assert.Equal("Auth Service", apiResponse.Data!.Name);
    }
}
