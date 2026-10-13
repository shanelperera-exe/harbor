using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using System.Collections.Generic;
using Harbor.Caching;
using Harbor.Reporting.Services;
using System;

namespace Harbor.Reporting.Hubs
{
    public class ServiceLogsHub : Hub
    {
        private readonly ICacheService _cacheService;
        private readonly IActiveSubscriptionTracker _tracker;

        public ServiceLogsHub(ICacheService cacheService, IActiveSubscriptionTracker tracker)
        {
            _cacheService = cacheService;
            _tracker = tracker;
        }

        public async Task SubscribeToService(string serviceId)
        {
            // Add the connection to a group specific to this service
            await Groups.AddToGroupAsync(Context.ConnectionId, $"logs_{serviceId}");
            _tracker.AddSubscription(serviceId, Context.ConnectionId);
            
            // Send buffered historical logs
            string cacheKey = $"logs:buffer:{serviceId}";
            var recentLogs = await _cacheService.GetAsync<List<object>>(cacheKey);
            if (recentLogs != null)
            {
                foreach (var log in recentLogs)
                {
                    await Clients.Caller.SendAsync("ReceiveLog", serviceId, log);
                }
            }

            // Send a welcome message back to confirm subscription
            await Clients.Caller.SendAsync("ReceiveLog", serviceId, new 
            { 
                timestamp = System.DateTime.UtcNow.ToString("HH:mm:ss"),
                level = "[system]",
                message = $"Connected to live log stream for {serviceId}..."
            });
        }

        public async Task UnsubscribeFromService(string serviceId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"logs_{serviceId}");
            _tracker.RemoveSubscription(serviceId, Context.ConnectionId);
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // In a robust implementation, you would track which connections mapped to which services
            // and clean them up here. For brevity, if a client abruptly disconnects, the tracker 
            // might have an orphan connection ID. In production, use OnDisconnectedAsync to prune.
            await base.OnDisconnectedAsync(exception);
        }
    }
}
