using System.Collections.Generic;
using System.Linq;
using Harbor.Reporting.Adapters;

namespace Harbor.Reporting.Factories
{
    public interface IProviderAdapterFactory
    {
        ILogProviderAdapter? GetAdapter(string providerName);
    }

    public class ProviderAdapterFactory : IProviderAdapterFactory
    {
        private readonly IEnumerable<ILogProviderAdapter> _adapters;

        public ProviderAdapterFactory(IEnumerable<ILogProviderAdapter> adapters)
        {
            _adapters = adapters;
        }

        public ILogProviderAdapter? GetAdapter(string providerName)
        {
            if (string.IsNullOrWhiteSpace(providerName))
                return null;
                
            return _adapters.FirstOrDefault(a => a.ProviderName.Equals(providerName, System.StringComparison.OrdinalIgnoreCase));
        }
    }
}
