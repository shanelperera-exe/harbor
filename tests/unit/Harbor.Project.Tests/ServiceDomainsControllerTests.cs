using System.Security.Claims;
using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Responses;
using Harbor.Project.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class ServiceDomainsControllerTests
{
    private readonly Mock<IServiceDomainService> _domainServiceMock = new();
    private readonly Mock<IServiceService> _serviceServiceMock = new();
    private readonly ServiceDomainsController _controller;

    public ServiceDomainsControllerTests()
    {
        _controller = new ServiceDomainsController(_domainServiceMock.Object, _serviceServiceMock.Object);
        SetUser("10", false);
    }

    private void SetUser(string? userId, bool isAdmin = false)
    {
        var claims = new List<Claim>();
        if (userId != null) claims.Add(new Claim("userId", userId));
        if (isAdmin) claims.Add(new Claim(ClaimTypes.Role, "Admin"));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, userId != null ? "mock" : null))
            }
        };
    }

    [Fact]
    public async Task GetDomains_NoUserId_ReturnsUnauthorized()
    {
        SetUser(null);
        var result = await _controller.GetDomains("p-1", "s-1");
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task GetDomains_ServiceNotFound_ReturnsNotFound()
    {
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((false, "Service not found.", null));

        var result = await _controller.GetDomains("p-1", "s-1");
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetDomains_Success_ReturnsOk()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));
        var domains = new List<ServiceDomainResponse>
        {
            new() { Id = 1, Domain = "app.domain.com", IsPrimary = true }
        };
        _domainServiceMock.Setup(d => d.GetDomainsAsync(100)).ReturnsAsync(domains);

        var result = await _controller.GetDomains("p-1", "s-1");
        var ok = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<ApiResponse<List<ServiceDomainResponse>>>(ok.Value);
        Assert.Single(response.Data!);
    }

    [Fact]
    public async Task AddDomain_Failure_ReturnsBadRequest()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));

        var req = new CreateServiceDomainRequest { Domain = "invalid domain" };
        _domainServiceMock.Setup(d => d.AddDomainAsync(100, req))
            .ReturnsAsync((false, "Invalid domain syntax", null));

        var result = await _controller.AddDomain("p-1", "s-1", req);
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task AddDomain_Success_Returns201()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));

        var req = new CreateServiceDomainRequest { Domain = "sub.domain.com" };
        var domain = new ServiceDomainResponse { Id = 5, Domain = "sub.domain.com" };
        _domainServiceMock.Setup(d => d.AddDomainAsync(100, req))
            .ReturnsAsync((true, null, domain));

        var result = await _controller.AddDomain("p-1", "s-1", req);
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, statusResult.StatusCode);
    }

    [Fact]
    public async Task DeleteDomain_Success_ReturnsNoContent()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));
        _domainServiceMock.Setup(d => d.DeleteDomainAsync(100, 5)).ReturnsAsync(true);

        var result = await _controller.DeleteDomain("p-1", "s-1", 5);
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task VerifyDomain_Success_ReturnsOk()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));
        _domainServiceMock.Setup(d => d.VerifyDomainAsync(100, 5)).ReturnsAsync((true, "Active"));

        var result = await _controller.VerifyDomain("p-1", "s-1", 5);
        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task SetPrimary_Success_ReturnsOk()
    {
        var service = new ServiceResponse { Id = 100, Name = "Web" };
        _serviceServiceMock.Setup(s => s.GetByIdAsync("s-1", 10, false))
            .ReturnsAsync((true, null, service));
        _domainServiceMock.Setup(d => d.SetPrimaryAsync(100, 5)).ReturnsAsync(true);

        var result = await _controller.SetPrimary("p-1", "s-1", 5);
        Assert.IsType<OkObjectResult>(result);
    }
}
