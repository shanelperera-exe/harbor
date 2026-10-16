using System;
using System.Collections.Generic;
using System.Data.Common;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Harbor.Common.Observability;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Common.Tests;

public class HealthCheckExtensionsTests
{
    private class DummyFactory { }

    private static ServiceCollection CreateServices()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        return services;
    }

    [Fact]
    public async Task AddHarborLiveness_CheckExecutesAndReturnsHealthy()
    {
        var services = CreateServices();
        services.AddHealthChecks().AddHarborLiveness("TestService");
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("live"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.True(report.Entries.ContainsKey("self"));
    }

    [Fact]
    public async Task AddHarborDbCheck_WhenFactoryNull_ReturnsHealthy()
    {
        var services = CreateServices();
        services.AddHealthChecks().AddHarborDbCheck<DummyFactory>(f => throw new NotImplementedException());
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("Database factory not registered", report.Entries["database"].Description);
    }

    [Fact]
    public async Task AddHarborDbCheck_WhenConnectionThrows_ReturnsUnhealthy()
    {
        var services = CreateServices();
        services.AddSingleton(new DummyFactory());
        services.AddHealthChecks().AddHarborDbCheck<DummyFactory>(f =>
        {
            var mockConn = new Mock<DbConnection>();
            mockConn.Setup(c => c.OpenAsync(It.IsAny<CancellationToken>())).ThrowsAsync(new InvalidOperationException("Conn failed"));
            return mockConn.Object;
        });
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Unhealthy, report.Status);
        Assert.Contains("Database connection failed", report.Entries["database"].Description);
    }

    [Fact]
    public async Task AddHarborDataSourceCheck_WhenNull_ReturnsHealthy()
    {
        var services = CreateServices();
        services.AddHealthChecks().AddHarborDataSourceCheck();
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("DbDataSource not registered", report.Entries["database"].Description);
    }

    [Fact]
    public async Task AddHarborCacheCheck_WhenNull_ReturnsHealthy()
    {
        var services = CreateServices();
        services.AddHealthChecks().AddHarborCacheCheck();
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("Cache not registered", report.Entries["redis"].Description);
    }

    [Fact]
    public async Task AddHarborCacheCheck_WhenThrows_ReturnsDegraded()
    {
        var mockCache = new Mock<IDistributedCache>();
        mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TimeoutException("Redis timed out"));

        var services = CreateServices();
        services.AddSingleton(mockCache.Object);
        services.AddHealthChecks().AddHarborCacheCheck();
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Degraded, report.Status);
        Assert.Contains("Redis cache unreachable", report.Entries["redis"].Description);
    }

    [Fact]
    public async Task AddHarborCacheCheck_WhenSuccessful_ReturnsHealthy()
    {
        var mockCache = new Mock<IDistributedCache>();
        mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        var services = CreateServices();
        services.AddSingleton(mockCache.Object);
        services.AddHealthChecks().AddHarborCacheCheck();
        var sp = services.BuildServiceProvider();

        var healthCheckService = sp.GetRequiredService<HealthCheckService>();
        var report = await healthCheckService.CheckHealthAsync(check => check.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("Redis cache is accessible", report.Entries["redis"].Description);
    }

    [Fact]
    public void MapHarborHealthChecks_RegistersEndpoints()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Services.AddHealthChecks();
        var app = builder.Build();

        var result = app.MapHarborHealthChecks();
        Assert.NotNull(result);
    }
}
