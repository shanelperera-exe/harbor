using Harbor.Reporting.Services;
using Xunit;

namespace Harbor.Reporting.Tests;

public class ActiveSubscriptionTrackerTests
{
    [Fact]
    public void Tracker_AddAndRemoveSubscriptions_TracksActiveServicesCorrectly()
    {
        var tracker = new ActiveSubscriptionTracker();

        // 1. Initially empty
        Assert.Empty(tracker.GetActiveServiceIds());

        // 2. Add first connection for s-1
        tracker.AddSubscription("s-1", "conn-1");
        Assert.Contains("s-1", tracker.GetActiveServiceIds());

        // 3. Add second connection for s-1
        tracker.AddSubscription("s-1", "conn-2");
        Assert.Single(tracker.GetActiveServiceIds());

        // 4. Add connection for s-2
        tracker.AddSubscription("s-2", "conn-3");
        var active = tracker.GetActiveServiceIds().ToList();
        Assert.Equal(2, active.Count);
        Assert.Contains("s-1", active);
        Assert.Contains("s-2", active);

        // 5. Remove one connection from s-1 (conn-2 remains)
        tracker.RemoveSubscription("s-1", "conn-1");
        Assert.Contains("s-1", tracker.GetActiveServiceIds());

        // 6. Remove remaining connection from s-1
        tracker.RemoveSubscription("s-1", "conn-2");
        Assert.DoesNotContain("s-1", tracker.GetActiveServiceIds());
        Assert.Contains("s-2", tracker.GetActiveServiceIds());

        // 7. Removing nonexistent service/connection does not throw
        tracker.RemoveSubscription("s-nonexistent", "conn-x");
        tracker.RemoveSubscription("s-2", "conn-not-found");
        Assert.Contains("s-2", tracker.GetActiveServiceIds());

        // 8. Remove final connection
        tracker.RemoveSubscription("s-2", "conn-3");
        Assert.Empty(tracker.GetActiveServiceIds());
    }
}
