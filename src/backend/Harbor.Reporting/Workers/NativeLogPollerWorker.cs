using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Harbor.Reporting.Hubs;
using Harbor.Reporting.Services;
using Harbor.Reporting.Adapters;
using Harbor.Caching;
using Harbor.Reporting.Factories;

namespace Harbor.Reporting.Workers
{
    public class NativeLogPollerWorker : BackgroundService
    {
        private readonly IHubContext<ServiceLogsHub> _hubContext;
        private readonly ILogger<NativeLogPollerWorker> _logger;
        private readonly IActiveSubscriptionTracker _tracker;
        private readonly IProviderAdapterFactory _factory;
        private readonly IProjectApiClient _apiClient;
        private readonly ICacheService _cacheService;

        public NativeLogPollerWorker(
            IHubContext<ServiceLogsHub> hubContext,
            ILogger<NativeLogPollerWorker> logger,
            IActiveSubscriptionTracker tracker,
            IProviderAdapterFactory factory,
            IProjectApiClient apiClient,
            ICacheService cacheService)
        {
            _hubContext = hubContext;
            _logger = logger;
            _tracker = tracker;
            _factory = factory;
            _apiClient = apiClient;
            _cacheService = cacheService;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NativeLogPollerWorker started. Monitoring active UI connections...");

            // We now resolve adapters dynamically per service.

            while (!stoppingToken.IsCancellationRequested)
            {
                var activeServiceIds = _tracker.GetActiveServiceIds().ToList();

                if (activeServiceIds.Any())
                {
                    foreach (var serviceId in activeServiceIds)
                    {
                        try
                        {
                            // 1. Fetch service details to get Provider and Token
                            var serviceInfo = await _apiClient.GetServiceDetailsAsync(serviceId);
                            if (serviceInfo == null || string.IsNullOrWhiteSpace(serviceInfo.Provider))
                            {
                                continue;
                            }

                            // 2. Resolve the correct adapter using the Factory
                            var adapter = _factory.GetAdapter(serviceInfo.Provider);
                            if (adapter == null)
                            {
                                continue;
                            }

                            // 3. Fetch real logs from the provider
                            var latestLogs = await adapter.FetchLatestLogsAsync(serviceId, serviceInfo.ProviderToken ?? "dummy_token", stoppingToken);
                            
                            // 4. Broadcast and Cache each log
                            foreach (var log in latestLogs)
                            {
                                var logEntry = new
                                {
                                    timestamp = log.Timestamp,
                                    level = $"[{log.Level}]",
                                    message = log.Message
                                };

                                // Broadcast to SignalR
                                await _hubContext.Clients.Group($"logs_{serviceId}").SendAsync("ReceiveLog", serviceId, logEntry, cancellationToken: stoppingToken);
                                
                                // Buffer in Redis
                                string cacheKey = $"logs:buffer:{serviceId}";
                                var recentLogs = await _cacheService.GetAsync<List<object>>(cacheKey) ?? new List<object>();
                                recentLogs.Add(logEntry);
                                if (recentLogs.Count > 100) recentLogs.RemoveRange(0, recentLogs.Count - 100);
                                await _cacheService.SetAsync(cacheKey, recentLogs, TimeSpan.FromHours(24));
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error pulling logs from native provider for {ServiceId}", serviceId);
                        }
                    }
                }

                // Poll every 5 seconds. Providers often rate limit aggressive polling.
                await Task.Delay(5000, stoppingToken);
            }
        }
    }
}
