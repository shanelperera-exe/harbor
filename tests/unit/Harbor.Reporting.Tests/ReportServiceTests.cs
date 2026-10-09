using Harbor.Reporting.DTOs;
using Harbor.Reporting.Models;
using Harbor.Reporting.Repositories;
using Harbor.Reporting.Services;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class ReportServiceTests
{
    private readonly Mock<IDeploymentReportRepository> _repoMock = new();
    private readonly ReportService _service;

    public ReportServiceTests()
    {
        _service = new ReportService(_repoMock.Object);
    }

    [Fact]
    public async Task GetDeploymentReportAsync_DelegatesToRepository_WithTrimmedParameters()
    {
        var query = new DeploymentReportQuery
        {
            ProjectId = "  proj-1  ",
            Environment = " Production ",
            Status = " Succeeded ",
            StartDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(2026, 1, 31, 23, 59, 59, DateTimeKind.Utc),
        };

        _repoMock
            .Setup(r => r.GetReportRowsAsync(
                42,
                false,
                "proj-1",
                "Production",
                "Succeeded",
                query.StartDate,
                query.EndDate))
            .ReturnsAsync(new List<DeploymentReportEntity>());

        var result = await _service.GetDeploymentReportAsync(42, false, query);

        _repoMock.Verify(r => r.GetReportRowsAsync(
            42,
            false,
            "proj-1",
            "Production",
            "Succeeded",
            query.StartDate,
            query.EndDate), Times.Once);

        Assert.NotNull(result);
        Assert.Equal(query, result.AppliedFilters);
        Assert.Empty(result.Items);
    }

    [Fact]
    public async Task GetDeploymentReportAsync_MapsEntityRowsToDtos_Correctly()
    {
        var startedAt = DateTime.UtcNow.AddMinutes(-10);
        var completedAt = startedAt.AddSeconds(600);

        var entities = new List<DeploymentReportEntity>
        {
            new()
            {
                Id = 101,
                PublicId = "dep-101",
                Environment = "Production",
                Version = "1.0.0",
                CommitSha = "abc1234",
                CommitMessage = "feat: initial commit",
                Status = "Succeeded",
                StartedAt = startedAt,
                CompletedAt = completedAt,
                FailureReason = null,
                ProjectName = "Alpha",
                ServiceName = "Api",
                UserName = "alice",
            }
        };

        _repoMock
            .Setup(r => r.GetReportRowsAsync(1, true, null, null, null, null, null))
            .ReturnsAsync(entities);

        var result = await _service.GetDeploymentReportAsync(1, true, new DeploymentReportQuery());

        Assert.Single(result.Items);
        var item = result.Items[0];
        Assert.Equal(101, item.Id);
        Assert.Equal("dep-101", item.PublicId);
        Assert.Equal("Production", item.Environment);
        Assert.Equal("1.0.0", item.Version);
        Assert.Equal("abc1234", item.CommitSha);
        Assert.Equal("feat: initial commit", item.CommitMessage);
        Assert.Equal("Succeeded", item.Status);
        Assert.Equal(startedAt, item.StartedAt);
        Assert.Equal(completedAt, item.CompletedAt);
        Assert.Equal("Alpha", item.ProjectName);
        Assert.Equal("Api", item.ServiceName);
        Assert.Equal("alice", item.UserName);
        Assert.Equal(600.0, item.DurationSeconds);
    }

    [Fact]
    public void ComputeStatistics_CalculatesTotalSuccessfulFailedAndSuccessRate_Correctly()
    {
        var items = new List<DeploymentReportItem>
        {
            new() { Id = 1, Status = "Succeeded", DurationSeconds = 120 },
            new() { Id = 2, Status = "Ready", DurationSeconds = 80 },
            new() { Id = 3, Status = "Failed", DurationSeconds = 40 },
            new() { Id = 4, Status = "Error", DurationSeconds = 60 },
            new() { Id = 5, Status = "Running", DurationSeconds = null },
        };

        var stats = ReportService.ComputeStatistics(items);

        Assert.Equal(5, stats.TotalDeployments);
        Assert.Equal(2, stats.SuccessfulDeployments); // Succeeded + Ready
        Assert.Equal(2, stats.FailedDeployments);     // Failed + Error
        // 2 successful out of 5 total = 40.0%
        Assert.Equal(40.0, stats.SuccessRate);
        // Completed durations: 120, 80, 40, 60 -> sum = 300 / 4 = 75.0
        Assert.Equal(75.0, stats.AverageDurationSeconds);
    }

    [Fact]
    public void ComputeStatistics_RoundsSuccessRateAndAverageDuration_ToExpectedPrecision()
    {
        var items = new List<DeploymentReportItem>
        {
            new() { Id = 1, Status = "Succeeded", DurationSeconds = 10.333 },
            new() { Id = 2, Status = "Succeeded", DurationSeconds = 20.333 },
            new() { Id = 3, Status = "Failed", DurationSeconds = 30.555 },
        };

        var stats = ReportService.ComputeStatistics(items);

        Assert.Equal(3, stats.TotalDeployments);
        Assert.Equal(2, stats.SuccessfulDeployments);
        Assert.Equal(1, stats.FailedDeployments);
        // 2 / 3 = 66.666...% -> rounded to 1 decimal place: 66.7
        Assert.Equal(66.7, stats.SuccessRate);
        // Average duration: (10.333 + 20.333 + 30.555) / 3 = 61.221 / 3 = 20.407 -> rounded to 2 decimal places: 20.41
        Assert.Equal(20.41, stats.AverageDurationSeconds);
    }

    [Fact]
    public void ComputeStatistics_WhenAllDeploymentsHaveNoDuration_AverageDurationIsNull()
    {
        var items = new List<DeploymentReportItem>
        {
            new() { Id = 1, Status = "Running", DurationSeconds = null },
            new() { Id = 2, Status = "Pending", DurationSeconds = null },
        };

        var stats = ReportService.ComputeStatistics(items);

        Assert.Equal(2, stats.TotalDeployments);
        Assert.Equal(0, stats.SuccessfulDeployments);
        Assert.Equal(0, stats.FailedDeployments);
        Assert.Equal(0.0, stats.SuccessRate);
        Assert.Null(stats.AverageDurationSeconds);
    }

    [Fact]
    public void ComputeStatistics_WhenEmptyList_ReturnsZeroStatsAndNullDuration_WithoutDivisionByZero()
    {
        var items = new List<DeploymentReportItem>();

        var stats = ReportService.ComputeStatistics(items);

        Assert.Equal(0, stats.TotalDeployments);
        Assert.Equal(0, stats.SuccessfulDeployments);
        Assert.Equal(0, stats.FailedDeployments);
        Assert.Equal(0.0, stats.SuccessRate);
        Assert.Null(stats.AverageDurationSeconds);
    }
}
