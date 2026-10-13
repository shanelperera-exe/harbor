using System.Security.Claims;
using Harbor.Deployment.Controllers;
using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Harbor.Deployment.Tests;

/// <summary>
/// Unit tests for <see cref="NotificationsController"/> (US-21).
/// Covers the three endpoints: GET /notifications, PATCH /notifications/{id}/read, PATCH /notifications/read-all.
/// </summary>
public class NotificationsControllerTests
{
    private readonly Mock<INotificationRepository> _repoMock = new();
    private readonly NotificationsController _controller;

    public NotificationsControllerTests()
    {
        _controller = new NotificationsController(_repoMock.Object);
    }

    private void SetUser(int? userId)
    {
        var claims = new List<Claim>();
        if (userId is not null)
            claims.Add(new Claim("userId", userId.Value.ToString()));

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
            }
        };
    }

    // ── GET /api/notifications ─────────────────────────────────────────────────

    [Fact]
    public async Task GetNotifications_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.GetNotifications();

        Assert.IsType<UnauthorizedResult>(result.Result);
        _repoMock.Verify(r => r.GetByUserIdAsync(It.IsAny<int>(), It.IsAny<int>()), Times.Never);
    }

    [Fact]
    public async Task GetNotifications_ValidUser_ReturnsListAndUnreadCount()
    {
        SetUser(userId: 7);
        var notifications = new List<NotificationEntity>
        {
            new() { Id = 1, UserId = 7, DeploymentId = 10, Type = "success", Title = "Deployment succeeded", Message = "v1.0 deployed to production", IsRead = false, CreatedAt = DateTime.UtcNow },
            new() { Id = 2, UserId = 7, DeploymentId = 11, Type = "failure", Title = "Deployment failed",    Message = "v1.1 failed in staging",  IsRead = true,  CreatedAt = DateTime.UtcNow.AddMinutes(-5) },
        };
        _repoMock.Setup(r => r.GetByUserIdAsync(7, 20)).ReturnsAsync(notifications);
        _repoMock.Setup(r => r.GetUnreadCountAsync(7)).ReturnsAsync(1);

        var result = await _controller.GetNotifications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<NotificationListResponse>(ok.Value);
        Assert.Equal(2, payload.Notifications.Count);
        Assert.Equal(1, payload.UnreadCount);
        Assert.Equal("success", payload.Notifications[0].Type);
        Assert.Equal("failure", payload.Notifications[1].Type);
    }

    [Fact]
    public async Task GetNotifications_EmptyList_ReturnsEmptyWithZeroUnread()
    {
        SetUser(userId: 5);
        _repoMock.Setup(r => r.GetByUserIdAsync(5, 20)).ReturnsAsync(new List<NotificationEntity>());
        _repoMock.Setup(r => r.GetUnreadCountAsync(5)).ReturnsAsync(0);

        var result = await _controller.GetNotifications();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var payload = Assert.IsType<NotificationListResponse>(ok.Value);
        Assert.Empty(payload.Notifications);
        Assert.Equal(0, payload.UnreadCount);
    }

    [Theory]
    [InlineData(0,  1)]   // below minimum → clamped to 1
    [InlineData(100, 50)] // above maximum → clamped to 50
    [InlineData(20, 20)]  // within range → unchanged
    public async Task GetNotifications_LimitClamping_RespectsMinMax(int inputLimit, int expectedLimit)
    {
        SetUser(userId: 3);
        _repoMock.Setup(r => r.GetByUserIdAsync(3, expectedLimit)).ReturnsAsync(new List<NotificationEntity>());
        _repoMock.Setup(r => r.GetUnreadCountAsync(3)).ReturnsAsync(0);

        await _controller.GetNotifications(inputLimit);

        _repoMock.Verify(r => r.GetByUserIdAsync(3, expectedLimit), Times.Once);
    }

    // ── PATCH /api/notifications/{id}/read ────────────────────────────────────

    [Fact]
    public async Task MarkAsRead_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.MarkAsRead(1);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task MarkAsRead_ExistingNotification_ReturnsNoContent()
    {
        SetUser(userId: 7);
        _repoMock.Setup(r => r.MarkAsReadAsync(42, 7)).ReturnsAsync(true);

        var result = await _controller.MarkAsRead(42);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task MarkAsRead_NotificationNotFound_ReturnsNotFound()
    {
        SetUser(userId: 7);
        _repoMock.Setup(r => r.MarkAsReadAsync(999, 7)).ReturnsAsync(false);

        var result = await _controller.MarkAsRead(999);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task MarkAsRead_NotificationOwnedByOtherUser_ReturnsNotFound()
    {
        // The repo returns false when userId doesn't match — controller returns 404 (no info leak).
        SetUser(userId: 99);
        _repoMock.Setup(r => r.MarkAsReadAsync(1, 99)).ReturnsAsync(false);

        var result = await _controller.MarkAsRead(1);

        Assert.IsType<NotFoundResult>(result);
    }

    // ── PATCH /api/notifications/read-all ────────────────────────────────────

    [Fact]
    public async Task MarkAllAsRead_NoUserIdClaim_ReturnsUnauthorized()
    {
        SetUser(userId: null);

        var result = await _controller.MarkAllAsRead();

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Fact]
    public async Task MarkAllAsRead_ValidUser_ReturnsNoContent()
    {
        SetUser(userId: 7);
        _repoMock.Setup(r => r.MarkAllAsReadAsync(7)).Returns(Task.CompletedTask);

        var result = await _controller.MarkAllAsRead();

        Assert.IsType<NoContentResult>(result);
        _repoMock.Verify(r => r.MarkAllAsReadAsync(7), Times.Once);
    }
}
