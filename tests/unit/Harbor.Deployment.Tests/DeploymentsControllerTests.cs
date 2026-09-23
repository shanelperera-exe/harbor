using System.Security.Claims;
using Harbor.Deployment.Controllers;
using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

public class DeploymentsControllerTests
{
    private readonly Mock<IDeploymentService> _serviceMock = new();
    private readonly DeploymentsController _controller;

    public DeploymentsControllerTests()
    {
        _controller = new DeploymentsController(_serviceMock.Object);
    }

    /// <summary>
    /// Wires up the same ClaimsPrincipal the JWT middleware would attach.
    /// Passing <c>null</c> for userId simulates a token with no userId claim.
    /// </summary>
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

    // ---------- GetHistory ----------

    [Fact]
    public async Task GetHistory_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.GetHistory(new DeploymentHistoryQuery());

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.GetHistoryAsync(It.IsAny<int>(), It.IsAny<DeploymentHistoryQuery>()), Times.Never);
    }

    [Fact]
    public async Task GetHistory_ValidUser_ReturnsOkWithPagedList()
    {
        SetUser(userId: 7);
        var expected = new DeploymentListResponse { Items = new List<DeploymentResponse>(), Page = 1, PageSize = 20, TotalCount = 0 };
        _serviceMock.Setup(s => s.GetHistoryAsync(7, It.IsAny<DeploymentHistoryQuery>())).ReturnsAsync(expected);

        var result = await _controller.GetHistory(new DeploymentHistoryQuery());

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var body = Assert.IsType<DeploymentListResponse>(ok.Value);
        Assert.Equal(0, body.TotalCount);
    }

    [Fact]
    public async Task GetHistory_PassesQueryParametersToService()
    {
        SetUser(userId: 5);
        var query = new DeploymentHistoryQuery { ServiceId = "13", Status = "Failed", Page = 2, PageSize = 10 };
        _serviceMock.Setup(s => s.GetHistoryAsync(5, query)).ReturnsAsync(new DeploymentListResponse());

        await _controller.GetHistory(query);

        _serviceMock.Verify(s => s.GetHistoryAsync(5, query), Times.Once);
    }

    // ---------- GetDetails ----------

    [Fact]
    public async Task GetDetails_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.GetDetails(1);

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.GetDetailsAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetDetails_DeploymentNotFound_ReturnsNotFound()
    {
        SetUser(userId: 7);
        _serviceMock.Setup(s => s.GetDetailsAsync(99, 7)).ReturnsAsync((DeploymentDetailsResponse?)null);

        var result = await _controller.GetDetails(99);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task GetDetails_DeploymentFound_ReturnsOkWithDetails()
    {
        SetUser(userId: 7);
        var details = new DeploymentDetailsResponse
        {
            Id = 8, ServiceId = 13, Environment = "staging", Version = "1.5.0",
            Status = "Failed", StartedAt = DateTime.UtcNow, FailureReason = "OOM",
            Logs = new List<DeploymentLogResponse>
            {
                new() { Level = "Error", Message = "Out of memory.", Timestamp = DateTime.UtcNow }
            }
        };
        _serviceMock.Setup(s => s.GetDetailsAsync(8, 7)).ReturnsAsync(details);

        var result = await _controller.GetDetails(8);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var body = Assert.IsType<DeploymentDetailsResponse>(ok.Value);
        Assert.Equal("Failed", body.Status);
        Assert.Single(body.Logs);
    }

    [Fact]
    public async Task GetDetails_OtherUsersDeployment_ReturnsNotFound()
    {
        // The service enforces ownership; it returns null for deployments owned by someone else.
        SetUser(userId: 99);
        _serviceMock.Setup(s => s.GetDetailsAsync(8, 99)).ReturnsAsync((DeploymentDetailsResponse?)null);

        var result = await _controller.GetDetails(8);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ---------- Create ----------

    [Fact]
    public async Task Create_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };

        var result = await _controller.Create(request);

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.CreateAsync(It.IsAny<CreateDeploymentRequest>(), It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task Create_ValidRequest_Returns201WithDeploymentDetails()
    {
        SetUser(userId: 7);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.4.0", CommitSha = "abc123" };
        _serviceMock.Setup(s => s.CreateAsync(request, 7, false)).ReturnsAsync((true, (string?)null, (int?)42, "", (string?)null));

        var result = await _controller.Create(request);

        var created = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(201, created.StatusCode);
        var body = Assert.IsType<CreateDeploymentResponse>(created.Value);
        Assert.Equal(42, body.Id);
        Assert.Equal("13", body.ServiceId);
        Assert.Equal(7, body.OwnerId);
        Assert.Equal("production", body.Environment);
        Assert.Equal("1.4.0", body.Version);
        Assert.Equal("Pending", body.Status);
    }

    [Fact]
    public async Task Create_ServiceFailure_Returns400WithProblemDetail()
    {
        SetUser(userId: 7);
        var request = new CreateDeploymentRequest { ServiceId = "999", Environment = "production", Version = "1.0.0" };
        _serviceMock.Setup(s => s.CreateAsync(request, 7, false)).ReturnsAsync((false, "Service not found.", (int?)null, "", (string?)null));

        var result = await _controller.Create(request);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    [Fact]
    public async Task Create_PermissionDenied_Returns400WithProblemDetail()
    {
        SetUser(userId: 99);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _serviceMock.Setup(s => s.CreateAsync(request, 99, false)).ReturnsAsync((false, "You do not have permission to deploy this service.", (int?)null, "", (string?)null));

        var result = await _controller.Create(request);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(400, problem.StatusCode);
    }

    [Fact]
    public async Task Create_AdminUser_PassesIsAdminTrueToService()
    {
        SetUser(userId: 99, isAdmin: true);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0" };
        _serviceMock.Setup(s => s.CreateAsync(request, 99, true)).ReturnsAsync((true, (string?)null, (int?)10, "", (string?)null));

        await _controller.Create(request);

        _serviceMock.Verify(s => s.CreateAsync(request, 99, true), Times.Once);
    }

    [Fact]
    public async Task Create_RegularUser_PassesIsAdminFalseToService()
    {
        SetUser(userId: 5);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "staging", Version = "2.0.0" };
        _serviceMock.Setup(s => s.CreateAsync(request, 5, false)).ReturnsAsync((true, (string?)null, (int?)7, "", (string?)null));

        await _controller.Create(request);

        _serviceMock.Verify(s => s.CreateAsync(request, 5, false), Times.Once);
    }

    [Fact]
    public async Task Create_ValidRequest_ResponseContainsCommitSha()
    {
        SetUser(userId: 7);
        var request = new CreateDeploymentRequest { ServiceId = "13", Environment = "production", Version = "1.0.0", CommitSha = "deadbeef" };
        _serviceMock.Setup(s => s.CreateAsync(request, 7, false)).ReturnsAsync((true, (string?)null, (int?)5, "", (string?)null));

        var result = await _controller.Create(request);

        var created = Assert.IsType<ObjectResult>(result.Result);
        var body = Assert.IsType<CreateDeploymentResponse>(created.Value);
        Assert.Equal("deadbeef", body.CommitSha);
    }
}
