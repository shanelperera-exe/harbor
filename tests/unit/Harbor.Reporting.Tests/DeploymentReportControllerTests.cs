using System.Security.Claims;
using Harbor.Reporting.Controllers;
using Harbor.Reporting.DTOs;
using Harbor.Reporting.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class DeploymentReportControllerTests
{
    private readonly Mock<IReportService> _serviceMock = new();
    private readonly DeploymentReportController _controller;

    public DeploymentReportControllerTests()
    {
        _controller = new DeploymentReportController(_serviceMock.Object);
    }

    private void SetUserContext(string? userId, bool isAdmin = false)
    {
        var claims = new List<Claim>();
        if (userId is not null)
        {
            claims.Add(new Claim("userId", userId));
        }
        if (isAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };
    }

    [Fact]
    public async Task GetDeploymentReport_WhenValidRequest_ReturnsOkWithReport()
    {
        SetUserContext("42", isAdmin: false);

        var query = new DeploymentReportQuery
        {
            ProjectId = "proj-1",
            Environment = "Production",
        };

        var expectedReport = new DeploymentReportResponse
        {
            AppliedFilters = query,
            Statistics = new DeploymentReportStatistics
            {
                TotalDeployments = 1,
                SuccessfulDeployments = 1,
                FailedDeployments = 0,
                SuccessRate = 100.0,
                AverageDurationSeconds = 120.0,
            },
            Items = new List<DeploymentReportItem>
            {
                new() { Id = 1, Status = "Succeeded", Environment = "Production" }
            }
        };

        _serviceMock
            .Setup(s => s.GetDeploymentReportAsync(42, false, query))
            .ReturnsAsync(expectedReport);

        var result = await _controller.GetDeploymentReport(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var report = Assert.IsType<DeploymentReportResponse>(okResult.Value);
        Assert.Equal(1, report.Statistics.TotalDeployments);
        Assert.Equal(100.0, report.Statistics.SuccessRate);
        Assert.Single(report.Items);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenAdminUser_PassesIsAdminTrue()
    {
        SetUserContext("1", isAdmin: true);

        var query = new DeploymentReportQuery();
        var emptyReport = new DeploymentReportResponse
        {
            AppliedFilters = query,
            Statistics = new DeploymentReportStatistics(),
            Items = new List<DeploymentReportItem>()
        };

        _serviceMock
            .Setup(s => s.GetDeploymentReportAsync(1, true, query))
            .ReturnsAsync(emptyReport);

        var result = await _controller.GetDeploymentReport(query);

        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        _serviceMock.Verify(s => s.GetDeploymentReportAsync(1, true, query), Times.Once);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenStartDateIsAfterEndDate_ReturnsBadRequest()
    {
        SetUserContext("42");

        var query = new DeploymentReportQuery
        {
            StartDate = new DateTime(2026, 2, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
        };

        var result = await _controller.GetDeploymentReport(query);

        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        var problem = Assert.IsType<ProblemDetails>(badRequestResult.Value);
        Assert.Equal("Invalid date range", problem.Title);
        Assert.Equal("StartDate must be on or before EndDate.", problem.Detail);
    }

    [Fact]
    public async Task GetDeploymentReport_WhenUserClaimMissing_ReturnsUnauthorized()
    {
        SetUserContext(null);

        var query = new DeploymentReportQuery();
        var result = await _controller.GetDeploymentReport(query);

        Assert.IsType<UnauthorizedResult>(result.Result);
    }
}
