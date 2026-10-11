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
    }
}
