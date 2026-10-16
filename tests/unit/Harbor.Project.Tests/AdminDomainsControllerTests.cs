using Harbor.Project.Controllers;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Project.Tests;

public class AdminDomainsControllerTests
{
    private readonly Mock<IServiceDomainRepository> _domainRepoMock = new();
    private readonly Mock<ILogger<AdminDomainsController>> _loggerMock = new();
    private readonly AdminDomainsController _controller;

    public AdminDomainsControllerTests()
    {
        _controller = new AdminDomainsController(_domainRepoMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetAllDomains_Success_ReturnsOk()
    {
        var list = new List<AdminDomainDto>
        {
            new() { Id = "1", DomainName = "example.com", SslStatus = "issued", DnsStatus = "verified" }
        };
        _domainRepoMock.Setup(r => r.GetAllAdminDomainsAsync()).ReturnsAsync(list);

        var result = await _controller.GetAllDomains();
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(list, ok.Value);
    }

    [Fact]
    public async Task GetAllDomains_Exception_Returns500()
    {
        _domainRepoMock.Setup(r => r.GetAllAdminDomainsAsync()).ThrowsAsync(new Exception("Database error"));

        var result = await _controller.GetAllDomains();
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
    }

    [Fact]
    public async Task VerifyDomain_InvalidId_ReturnsBadRequest()
    {
        var result = await _controller.VerifyDomain("not-an-int");
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task VerifyDomain_NotFound_ReturnsNotFound()
    {
        _domainRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((ServiceDomainEntity?)null);

        var result = await _controller.VerifyDomain("10");
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task VerifyDomain_Success_ReturnsOk()
    {
        var domain = new ServiceDomainEntity { Id = 10, Domain = "app.org", ServiceId = 1 };
        _domainRepoMock.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(domain);
        _domainRepoMock.Setup(r => r.GetAllAdminDomainsAsync()).ReturnsAsync(new List<AdminDomainDto>());

        var result = await _controller.VerifyDomain("10");
        var ok = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<AdminDomainDto>(ok.Value);
        Assert.Equal("10", dto.Id);
        Assert.Equal("app.org", dto.DomainName);
    }

    [Fact]
    public async Task DeleteDomain_InvalidId_ReturnsBadRequest()
    {
        var result = await _controller.DeleteDomain("abc");
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteDomain_NotFound_ReturnsNotFound()
    {
        _domainRepoMock.Setup(r => r.DeleteAsync(5)).ReturnsAsync(false);

        var result = await _controller.DeleteDomain("5");
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task DeleteDomain_Success_ReturnsOk()
    {
        _domainRepoMock.Setup(r => r.DeleteAsync(5)).ReturnsAsync(true);

        var result = await _controller.DeleteDomain("5");
        Assert.IsType<OkObjectResult>(result);
    }
}
