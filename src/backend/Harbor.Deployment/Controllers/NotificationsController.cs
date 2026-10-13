using Harbor.Deployment.DTOs;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Harbor.Deployment.Controllers;

/// <summary>
/// Provides in-app deployment notification management endpoints (US-21).
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(INotificationRepository notificationRepository) : ControllerBase
{
    /// <summary>
    /// Returns the authenticated user's recent notifications together with the unread count.
    /// </summary>
    /// <param name="limit">Maximum number of notifications to return (default 20, max 50).</param>
    /// <response code="200">List of notifications and the current unread count.</response>
    /// <response code="401">The user is not authenticated.</response>
    [HttpGet]
    [ProducesResponseType(typeof(NotificationListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<NotificationListResponse>> GetNotifications([FromQuery] int limit = 20)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        limit = Math.Clamp(limit, 1, 50);

        var notifications = await notificationRepository.GetByUserIdAsync(userId.Value, limit);
        var unreadCount   = await notificationRepository.GetUnreadCountAsync(userId.Value);

        var dtos = notifications.Select(MapToDto).ToList();

        return Ok(new NotificationListResponse
        {
            Notifications = dtos,
            UnreadCount   = unreadCount,
        });
    }

    /// <summary>
    /// Marks a single notification as read.
    /// </summary>
    /// <param name="id">The notification ID.</param>
    /// <response code="204">Notification successfully marked as read.</response>
    /// <response code="401">The user is not authenticated.</response>
    /// <response code="404">Notification not found or does not belong to the authenticated user.</response>
    [HttpPatch("{id:int}/read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var updated = await notificationRepository.MarkAsReadAsync(id, userId.Value);
        return updated ? NoContent() : NotFound();
    }

    /// <summary>
    /// Marks all unread notifications for the authenticated user as read.
    /// </summary>
    /// <response code="204">All notifications marked as read.</response>
    /// <response code="401">The user is not authenticated.</response>
    [HttpPatch("read-all")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        await notificationRepository.MarkAllAsReadAsync(userId.Value);
        return NoContent();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private int? GetUserId()
        => int.TryParse(User.FindFirst("userId")?.Value, out var id) ? id : null;

    private static NotificationDto MapToDto(NotificationEntity entity) =>
        new()
        {
            Id           = entity.Id,
            DeploymentId = entity.DeploymentId,
            Type         = entity.Type,
            Title        = entity.Title,
            Message      = entity.Message,
            IsRead       = entity.IsRead,
            CreatedAt    = entity.CreatedAt,
            Environment  = entity.Environment,
            ServiceName  = entity.ServiceName,
            ProjectName  = entity.ProjectName,
            Version      = entity.Version,
        };
}
