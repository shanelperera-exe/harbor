using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Harbor.Project.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Project.Tests
{
    public class ServiceDomainServiceTests
    {
        private readonly Mock<IServiceDomainRepository> _domainRepo = new();
        private readonly Mock<IServiceRepository> _serviceRepo = new();
        private readonly Mock<ILogger<ServiceDomainService>> _logger = new();
        private readonly ServiceDomainService _service;

        public ServiceDomainServiceTests()
        {
            _service = new ServiceDomainService(_domainRepo.Object, _serviceRepo.Object, _logger.Object);
        }

        [Fact]
        public async Task AddDomainAsync_ValidSubdomain_CalculatesCnameTarget()
        {
            // Arrange
            var service = new ServiceEntity { Id = 10, Name = "web-service", Provider = "Vercel" };
            _serviceRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(service);
            _domainRepo.Setup(r => r.GetByDomainAsync(10, "app.example.com")).ReturnsAsync((ServiceDomainEntity?)null);
            _domainRepo.Setup(r => r.GetByServiceIdAsync(10)).ReturnsAsync(new List<ServiceDomainEntity>());
            _domainRepo.Setup(r => r.CreateAsync(It.IsAny<ServiceDomainEntity>())).ReturnsAsync(101);

            // Act
            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = "app.example.com",
                Environment = "Production"
            });

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(domain);
            Assert.Equal("app.example.com", domain.Domain);
            Assert.Equal("CNAME", domain.DnsType);
            Assert.Equal("app", domain.DnsHost);
            Assert.Equal("cname.vercel-dns.com", domain.DnsTarget);
        }

        [Fact]
        public async Task AddDomainAsync_RailwayProvider_CalculatesRailwayCnameTarget()
        {
            // Arrange
            var service = new ServiceEntity
            {
                Id = 10,
                Name = "web-service",
                Provider = "Railway",
                DeploymentUrl = "https://my-app.up.railway.app"
            };
            _serviceRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(service);
            _domainRepo.Setup(r => r.GetByDomainAsync(10, "app.example.com")).ReturnsAsync((ServiceDomainEntity?)null);
            _domainRepo.Setup(r => r.GetByServiceIdAsync(10)).ReturnsAsync(new List<ServiceDomainEntity>());
            _domainRepo.Setup(r => r.CreateAsync(It.IsAny<ServiceDomainEntity>())).ReturnsAsync(101);

            // Act
            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = "app.example.com",
                Environment = "Production"
            });

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(domain);
            Assert.Equal("app.example.com", domain.Domain);
            Assert.Equal("CNAME", domain.DnsType);
            Assert.Equal("app", domain.DnsHost);
            Assert.Equal("my-app.up.railway.app", domain.DnsTarget);
        }

        [Fact]
        public async Task AddDomainAsync_ValidApexDomain_CalculatesARecord()
        {
            // Arrange
            var service = new ServiceEntity { Id = 10, Name = "web-service", Provider = "AWS" };
            _serviceRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(service);
            _domainRepo.Setup(r => r.GetByDomainAsync(10, "example.com")).ReturnsAsync((ServiceDomainEntity?)null);
            _domainRepo.Setup(r => r.GetByServiceIdAsync(10)).ReturnsAsync(new List<ServiceDomainEntity>());
            _domainRepo.Setup(r => r.CreateAsync(It.IsAny<ServiceDomainEntity>())).ReturnsAsync(102);

            // Act
            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = "example.com",
                Environment = "Production"
            });

            // Assert
            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(domain);
            Assert.Equal("example.com", domain.Domain);
            Assert.Equal("A", domain.DnsType);
            Assert.Equal("@", domain.DnsHost);
            Assert.Equal("76.76.21.21", domain.DnsTarget);
        }

        [Theory]
        [InlineData("not a domain")]
        [InlineData("http://")]
        [InlineData("domain..com")]
        [InlineData("")]
        public async Task AddDomainAsync_InvalidDomain_ReturnsError(string invalidDomain)
        {
            // Act
            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = invalidDomain
            });

            // Assert
            Assert.False(success);
            Assert.NotNull(error);
            Assert.Null(domain);
        }

        [Fact]
        public async Task AddDomainAsync_DuplicateDomain_ReturnsError()
        {
            // Arrange
            _domainRepo.Setup(r => r.GetByDomainAsync(10, "app.example.com"))
                .ReturnsAsync(new ServiceDomainEntity { Id = 1, Domain = "app.example.com" });

            // Act
            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = "app.example.com"
            });

            // Assert
            Assert.False(success);
            Assert.Equal("This domain is already registered for this service.", error);
            Assert.Null(domain);
        }

        [Fact]
        public async Task AddDomainAsync_ServiceNotFound_ReturnsError()
        {
            _domainRepo.Setup(r => r.GetByDomainAsync(10, "app.example.com")).ReturnsAsync((ServiceDomainEntity?)null);
            _serviceRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync((ServiceEntity?)null);

            var (success, error, domain) = await _service.AddDomainAsync(10, new CreateServiceDomainRequest
            {
                Domain = "app.example.com"
            });

            Assert.False(success);
            Assert.Equal("Service not found.", error);
            Assert.Null(domain);
        }

        [Fact]
        public async Task GetDomainsAsync_AutoCreatesSystemDomainWhenDeploymentUrlPresent()
        {
            var service = new ServiceEntity { Id = 10, DeploymentUrl = "https://app-123.harbor.app/" };
            _serviceRepo.Setup(r => r.GetByIdAsync(10)).ReturnsAsync(service);
            _domainRepo.SetupSequence(r => r.GetByServiceIdAsync(10))
                .ReturnsAsync(new List<ServiceDomainEntity>())
                .ReturnsAsync(new List<ServiceDomainEntity>
                {
                    new() { Id = 1, Domain = "app-123.harbor.app", IsSystem = true, Status = "Active" }
                });

            var domains = await _service.GetDomainsAsync(10);
            Assert.Single(domains);
            Assert.Equal("app-123.harbor.app", domains[0].Domain);
            _domainRepo.Verify(r => r.CreateAsync(It.Is<ServiceDomainEntity>(e => e.IsSystem && e.Domain == "app-123.harbor.app")), Times.Once);
        }

        [Fact]
        public async Task DeleteDomainAsync_AllBranches()
        {
            _domainRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((ServiceDomainEntity?)null);
            Assert.False(await _service.DeleteDomainAsync(10, 1));

            _domainRepo.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(new ServiceDomainEntity { Id = 2, ServiceId = 999 });
            Assert.False(await _service.DeleteDomainAsync(10, 2));

            _domainRepo.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new ServiceDomainEntity { Id = 3, ServiceId = 10 });
            _domainRepo.Setup(r => r.DeleteAsync(3)).ReturnsAsync(true);
            Assert.True(await _service.DeleteDomainAsync(10, 3));
        }

        [Fact]
        public async Task SetPrimaryAsync_AllBranches()
        {
            _domainRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((ServiceDomainEntity?)null);
            Assert.False(await _service.SetPrimaryAsync(10, 1));

            _domainRepo.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(new ServiceDomainEntity { Id = 2, ServiceId = 999 });
            Assert.False(await _service.SetPrimaryAsync(10, 2));

            _domainRepo.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new ServiceDomainEntity { Id = 3, ServiceId = 10 });
            _domainRepo.Setup(r => r.SetPrimaryAsync(10, 3)).ReturnsAsync(true);
            Assert.True(await _service.SetPrimaryAsync(10, 3));
        }

        [Fact]
        public async Task VerifyDomainAsync_AllBranches()
        {
            _domainRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync((ServiceDomainEntity?)null);
            var (s1, err1) = await _service.VerifyDomainAsync(10, 1);
            Assert.False(s1);

            _domainRepo.Setup(r => r.GetByIdAsync(2)).ReturnsAsync(new ServiceDomainEntity { Id = 2, ServiceId = 999 });
            var (s2, err2) = await _service.VerifyDomainAsync(10, 2);
            Assert.False(s2);

            _domainRepo.Setup(r => r.GetByIdAsync(3)).ReturnsAsync(new ServiceDomainEntity { Id = 3, ServiceId = 10, Domain = "localhost" });
            var (s3, status3) = await _service.VerifyDomainAsync(10, 3);
            Assert.True(s3);
            Assert.Equal("Active", status3);
        }
    }
}
