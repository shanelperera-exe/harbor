using System.Security.Claims;
using Harbor.Deployment.Controllers;
using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

public class DashboardControllerTests
{
    private readonly Mock<IDeploymentService> _serviceMock = new();
    private readonly DashboardController _controller;

    public DashboardControllerTests()
    {
        _controller = new DashboardController(_serviceMock.Object);
    }

    private void SetUser(int? userId, bool isAdmin = false)
    {
        var claims = new List<Claim>();
        if (userId is not null)
            claims.Add(new Claim("userId", userId.Value.ToString()));
        if (isAdmin)
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }

    [Fact]
    public async Task Get_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.Get();

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.GetDashboardAsync(It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task Get_InvalidUserIdClaim_ReturnsUnauthorized()
    {
        var claims = new List<Claim> { new Claim("userId", "not-an-int") };
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };

        var result = await _controller.Get();

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.GetDashboardAsync(It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task Get_RegularUser_CallsServiceWithIsAdminFalse()
    {
        SetUser(userId: 42, isAdmin: false);
        var expected = new DashboardSummaryResponse
        {
            Projects = new List<DashboardProjectDto>
            {
                new() { Id = 1, Name = "Alpha", OwnerId = 42 }
            },
            RecentDeployments = new List<DashboardDeploymentDto>
            {
                new() { Id = 10, Status = "Succeeded" }
            },
            Metrics = new DashboardMetricsDto { TotalProjects = 1, TotalDeployments = 1, SuccessfulDeployments = 1 }
        };
        _serviceMock.Setup(s => s.GetDashboardAsync(42, false)).ReturnsAsync(expected);

        var result = await _controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<DashboardSummaryResponse>(ok.Value);
        Assert.Single(payload.Projects);
        Assert.Single(payload.RecentDeployments);
        Assert.Equal(1, payload.Metrics.SuccessfulDeployments);
        _serviceMock.Verify(s => s.GetDashboardAsync(42, false), Times.Once);
    }

    [Fact]
    public async Task Get_AdminUser_CallsServiceWithIsAdminTrue()
    {
        SetUser(userId: 99, isAdmin: true);
        var expected = new DashboardSummaryResponse();
        _serviceMock.Setup(s => s.GetDashboardAsync(99, true)).ReturnsAsync(expected);

        var result = await _controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Same(expected, ok.Value);
        _serviceMock.Verify(s => s.GetDashboardAsync(99, true), Times.Once);
    }

    [Fact]
    public async Task Get_ReturnsCorrectResponseType()
    {
        SetUser(userId: 1, isAdmin: false);
        var expected = new DashboardSummaryResponse
        {
            Projects = new List<DashboardProjectDto>(),
            RecentDeployments = new List<DashboardDeploymentDto>(),
            Metrics = new DashboardMetricsDto()
        };
        _serviceMock.Setup(s => s.GetDashboardAsync(1, false)).ReturnsAsync(expected);

        var result = await _controller.Get();

        Assert.IsType<OkObjectResult>(result.Result);
        var ok = (OkObjectResult)result.Result!;
        Assert.IsType<DashboardSummaryResponse>(ok.Value);
    }

    [Fact]
    public async Task Get_MultipleProjectsAndDeployments_ReturnsAll()
    {
        SetUser(userId: 100, isAdmin: false);
        var expected = new DashboardSummaryResponse
        {
            Projects = new List<DashboardProjectDto>
            {
                new() { Id = 1, Name = "Project A", OwnerId = 100, TotalDeployments = 5 },
                new() { Id = 2, Name = "Project B", OwnerId = 100, TotalDeployments = 3 },
                new() { Id = 3, Name = "Project C", OwnerId = 100, TotalDeployments = 7 }
            },
            RecentDeployments = new List<DashboardDeploymentDto>
            {
                new() { Id = 1, Status = "Succeeded" },
                new() { Id = 2, Status = "Running" },
                new() { Id = 3, Status = "Failed" },
                new() { Id = 4, Status = "Pending" },
                new() { Id = 5, Status = "Succeeded" }
            },
            Metrics = new DashboardMetricsDto
            {
                TotalProjects = 3,
                TotalDeployments = 15,
                SuccessfulDeployments = 8,
                RunningDeployments = 3,
                FailedDeployments = 4
            }
        };
        _serviceMock.Setup(s => s.GetDashboardAsync(100, false)).ReturnsAsync(expected);

        var result = await _controller.Get();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<DashboardSummaryResponse>(ok.Value);
        Assert.Equal(3, payload.Projects.Count);
        Assert.Equal(5, payload.RecentDeployments.Count);
        Assert.Equal(3, payload.Metrics.TotalProjects);
        Assert.Equal(15, payload.Metrics.TotalDeployments);
    }
}
