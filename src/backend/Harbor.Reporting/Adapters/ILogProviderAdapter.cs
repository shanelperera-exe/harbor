using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Harbor.Reporting.Adapters
{
    public class ProviderLogEntry
    {
        public string Level { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Timestamp { get; set; } = string.Empty;
    }

    public interface ILogProviderAdapter
    {
        string ProviderName { get; }
        
        /// <summary>
        /// Fetches the latest logs from the native provider's API (e.g. Vercel, AWS).
        /// </summary>
        Task<IEnumerable<ProviderLogEntry>> FetchLatestLogsAsync(string serviceId, string apiToken, CancellationToken ct);
    }
}
