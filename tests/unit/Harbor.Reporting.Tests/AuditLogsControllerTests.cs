using System;
using System.Threading.Tasks;
using Harbor.Reporting.Controllers;
using Harbor.Reporting.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class AuditLogsControllerTests
{
    [Fact]
    public async Task GetAuditLogs_WhenDatabaseThrows_Returns500InternalServerError()
    {
        // An invalid connection string causes OpenAsync to throw, exercising catch block
        var inMemorySettings = new System.Collections.Generic.Dictionary<string, string?>
        {
            ["ConnectionStrings:HarborDb"] = "Host=127.0.0.1;Port=1;Database=none;Timeout=1;CommandTimeout=1;"
        };
        IConfiguration configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var dbFactory = new ReportingDbConnectionFactory(configuration);
        var loggerMock = new Mock<ILogger<AuditLogsController>>();
        var controller = new AuditLogsController(dbFactory, loggerMock.Object);

        var result = await controller.GetAuditLogs(limit: 10);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status500InternalServerError, objectResult.StatusCode);
    }
}
