using Harbor.Deployment.Models;

namespace Harbor.Deployment.Repositories;

public interface INotificationRepository
{
    /// <summary>Creates a new notification and returns its generated ID.</summary>
    Task<int> CreateAsync(NotificationEntity notification);

    /// <summary>Returns up to <paramref name="limit"/> notifications for a user, newest first.</summary>
    Task<IReadOnlyList<NotificationEntity>> GetByUserIdAsync(int userId, int limit = 20);

    /// <summary>Returns the count of unread notifications for a user.</summary>
    Task<int> GetUnreadCountAsync(int userId);

    /// <summary>Marks a single notification as read. Returns false when not found or not owned.</summary>
    Task<bool> MarkAsReadAsync(int notificationId, int userId);

    /// <summary>Marks all unread notifications for a user as read.</summary>
    Task MarkAllAsReadAsync(int userId);
}
