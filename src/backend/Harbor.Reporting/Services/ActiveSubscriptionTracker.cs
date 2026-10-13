using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Harbor.Reporting.Services
{
    public interface IActiveSubscriptionTracker
    {
        void AddSubscription(string serviceId, string connectionId);
        void RemoveSubscription(string serviceId, string connectionId);
        IEnumerable<string> GetActiveServiceIds();
    }

    public class ActiveSubscriptionTracker : IActiveSubscriptionTracker
    {
        // Maps ServiceId -> HashSet of ConnectionIds
        // In a multi-node production setup, this would be backed by Redis Sets instead of memory.
        private readonly ConcurrentDictionary<string, HashSet<string>> _subscriptions = new();

        public void AddSubscription(string serviceId, string connectionId)
        {
            _subscriptions.AddOrUpdate(
                serviceId,
                _ => new HashSet<string> { connectionId },
                (_, set) => 
                {
                    lock(set) { set.Add(connectionId); }
                    return set;
                }
            );
        }

        public void RemoveSubscription(string serviceId, string connectionId)
        {
            if (_subscriptions.TryGetValue(serviceId, out var set))
            {
                lock (set)
                {
                    set.Remove(connectionId);
                    if (set.Count == 0)
                    {
                        _subscriptions.TryRemove(serviceId, out _);
                    }
                }
            }
        }

        public IEnumerable<string> GetActiveServiceIds()
        {
            return _subscriptions.Keys;
        }
    }
}
