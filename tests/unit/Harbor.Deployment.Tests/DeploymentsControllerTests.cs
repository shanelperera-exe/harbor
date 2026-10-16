using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Harbor.Deployment.Controllers;
using Harbor.Deployment.DTOs;
using Harbor.Deployment.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

[Collection("WebhookSecretCollection")]
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

        var result = await _controller.GetDetails("1");

        Assert.IsType<UnauthorizedResult>(result.Result);
        _serviceMock.Verify(s => s.GetDetailsAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
    }

    [Fact]
    public async Task GetDetails_DeploymentNotFound_ReturnsNotFound()
    {
        SetUser(userId: 7);
        _serviceMock.Setup(s => s.GetDetailsAsync("99", 7, false)).ReturnsAsync((DeploymentDetailsResponse?)null);

        var result = await _controller.GetDetails("99");

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
        _serviceMock.Setup(s => s.GetDetailsAsync("8", 7, false)).ReturnsAsync(details);

        var result = await _controller.GetDetails("8");

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var body = Assert.IsType<DeploymentDetailsResponse>(ok.Value);
        Assert.Equal("Failed", body.Status);
        Assert.Single(body.Logs);
    }

    [Fact]
    public async Task GetDetails_AdminPassesAdminAccessToService()
    {
        SetUser(userId: 42, isAdmin: true);
        _serviceMock.Setup(s => s.GetDetailsAsync("dep-abc", 42, true))
            .ReturnsAsync(new DeploymentDetailsResponse { Id = 8, Status = "Succeeded" });

        var result = await _controller.GetDetails("dep-abc");

        Assert.IsType<OkObjectResult>(result.Result);
        _serviceMock.Verify(s => s.GetDetailsAsync("dep-abc", 42, true), Times.Once);
    }

    [Fact]
    public async Task GetDetails_OtherUsersDeployment_ReturnsNotFound()
    {
        // The service returns null when the caller cannot access the deployment's project.
        SetUser(userId: 99);
        _serviceMock.Setup(s => s.GetDetailsAsync("8", 99, false)).ReturnsAsync((DeploymentDetailsResponse?)null);

        var result = await _controller.GetDetails("8");

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
        _serviceMock.Setup(s => s.CreateAsync(request, 7, false)).ReturnsAsync((true, (string?)null, (int?)42, "Pending", (string?)null));

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

    // ---------- GetCiRuns ----------

    [Fact]
    public async Task GetCiRuns_NoUserId_ReturnsUnauthorized()
    {
        SetUser(userId: null);
        var query = new CiRunQuery { ServiceId = "10", Page = 1, PageSize = 10 };
        var result = await _controller.GetCiRuns(query);
        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task GetCiRuns_ValidUser_ReturnsOk()
    {
        SetUser(userId: 7);
        var query = new CiRunQuery { ServiceId = "10", Page = 1, PageSize = 10 };
        _serviceMock.Setup(s => s.GetCiRunsAsync(7, "10", 1, 10))
            .ReturnsAsync(new CiRunListResponse { Items = Array.Empty<CiRunResponse>(), TotalCount = 0, Page = 1, PageSize = 10 });

        var result = await _controller.GetCiRuns(query);
        Assert.IsType<OkObjectResult>(result.Result);
    }

    // ---------- Redeploy ----------

    [Fact]
    public async Task Redeploy_NoUser_ReturnsUnauthorized()
    {
        SetUser(userId: null);
        var result = await _controller.Redeploy("dep-1");
        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task Redeploy_FailedLookup_ReturnsNotFound()
    {
        SetUser(userId: 7);
        _serviceMock.Setup(s => s.RedeployAsync("dep-1", 7, false))
            .ReturnsAsync((false, "Deployment not found", (int?)null, "Failed", (string?)null));

        var result = await _controller.Redeploy("dep-1");
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Redeploy_Success_ReturnsCreated()
    {
        SetUser(userId: 7);
        _serviceMock.Setup(s => s.RedeployAsync("dep-1", 7, false))
            .ReturnsAsync((true, (string?)null, (int?)55, "Queued", (string?)null));

        var result = await _controller.Redeploy("dep-1");
        var objResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status201Created, objResult.StatusCode);
    }

    // ---------- UpdateStatus ----------

    [Fact]
    public async Task UpdateStatus_NoSecret_ReturnsUnauthorized()
    {
        Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", null);
        Environment.SetEnvironmentVariable("GITHUB_APP_WEBHOOK_SECRET", null);
        Environment.SetEnvironmentVariable("GITHUB_WEBHOOK_SECRET", null);

        var result = await _controller.UpdateStatus(1);
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_InvalidSignature_ReturnsUnauthorized()
    {
        const string secret = "webhook-secret-123";
        Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", secret);

        var payload = "{\"Status\":\"Running\"}";
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Harbor-Signature"] = "invalid-sig";
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(payload));
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var result = await _controller.UpdateStatus(1);
        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task UpdateStatus_ValidSignature_InvalidStatus_ReturnsBadRequest()
    {
        const string secret = "webhook-secret-123";
        Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", secret);

        var payload = "{\"Status\":\"InvalidStatus\"}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Harbor-Signature"] = hash;
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(payload));
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        var result = await _controller.UpdateStatus(1);
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Contains("Status must be Running, Succeeded, or Failed", badRequest.Value!.ToString());
    }

    [Fact]
    public async Task UpdateStatus_ValidSignature_ValidStatus_Success_ReturnsNoContent()
    {
        const string secret = "webhook-secret-123";
        Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", secret);

        var payload = "{\"Status\":\"Succeeded\"}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload))).ToLowerInvariant();

        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers["X-Harbor-Signature"] = hash;
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(payload));
        _controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        _serviceMock.Setup(s => s.UpdateStatusAsync(1, "Succeeded", (string?)null)).ReturnsAsync(true);

        var result = await _controller.UpdateStatus(1);
        Assert.IsType<NoContentResult>(result);
    }
}
