import { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Trash2, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { 
  fetchPlatformDomains, 
  verifyDomainDns, 
  revokeDomain, 
  type PlatformDomain 
} from '../../services/domainService';
import { format } from '../../utils/dateUtils';

export default function GlobalDomains() {
  const [domains, setDomains] = useState<PlatformDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'cname_missing'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPlatformDomains();
      setDomains(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyDns = async (domain: PlatformDomain) => {
    setActionLoadingId(domain.id);
    try {
      const updated = await verifyDomainDns(domain.id);
      setDomains(prev => prev.map(d => d.id === domain.id ? updated : d));
      setToastMessage(`DNS verified and SSL certificate provisioned for ${domain.domainName}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeDomain = async (domain: PlatformDomain) => {
    if (!window.confirm(`Are you sure you want to force release the domain "${domain.domainName}" from tenant routing?`)) {
      return;
    }
    setActionLoadingId(domain.id);
    try {
      await revokeDomain(domain.id);
      setDomains(prev => prev.filter(d => d.id !== domain.id));
      setToastMessage(`Domain ${domain.domainName} removed from routing ingress.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredDomains = useMemo(() => {
    return domains.filter(d => {
      const matchesSearch = 
        d.domainName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.dnsStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [domains, searchQuery, statusFilter]);

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Platform Custom Domains
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-[#2c2d30] border border-gray-300 dark:border-[#3c4043] text-gray-600 dark:text-[#bdc1c6]">
              {domains.length} active mappings
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Global edge routing, TLS / Let's Encrypt certificates, CNAME record validation across all customer tenants.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Toast */}
      {toastMessage && (
        <div className="mt-4 p-3 rounded-sm border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono flex items-center justify-between">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} className="hover:underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 my-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search domain, tenant project, or service..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9aa0a6]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="all">All DNS Statuses</option>
            <option value="verified">Verified</option>
            <option value="cname_missing">CNAME Missing</option>
          </select>
        </div>
      </div>

      {/* Domains Table */}
      <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50/75 dark:bg-[#28292c] text-gray-600 dark:text-[#9aa0a6] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Domain Name</th>
                <th className="py-2.5 px-3">Routed Project & Service</th>
                <th className="py-2.5 px-3">Env</th>
                <th className="py-2.5 px-3">SSL Certificate</th>
                <th className="py-2.5 px-3">DNS Status</th>
                <th className="py-2.5 px-3">CNAME Target</th>
                <th className="py-2.5 px-3">Registered</th>
                <th className="py-2.5 px-3 text-right">Edge Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading domain registry...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDomains.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    No custom domains matched your query.
                  </td>
                </tr>
              ) : (
                filteredDomains.map(dom => {
                  const isBusy = actionLoadingId === dom.id;

                  return (
                    <tr 
                      key={dom.id} 
                      className="hover:bg-gray-50/80 dark:hover:bg-[#27282b] transition-colors"
                    >
                      {/* Domain */}
                      <td className="py-2.5 px-3 font-mono font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-2">
                          <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <a 
                            href={`https://${dom.domainName}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="hover:underline flex items-center space-x-1"
                          >
                            <span>{dom.domainName}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          </a>
                        </div>
                      </td>

                      {/* Route Target */}
                      <td className="py-2.5 px-3 text-gray-700 dark:text-[#bdc1c6]">
                        <div className="font-medium">{dom.projectName}</div>
                        <div className="text-[10px] font-mono text-gray-400 dark:text-[#9aa0a6]">
                          Service: {dom.serviceName}
                        </div>
                      </td>

                      {/* Env */}
                      <td className="py-2.5 px-3 font-mono text-gray-600 dark:text-[#bdc1c6]">
                        <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-[#3c4043] text-[10px]">
                          {dom.environment}
                        </span>
                      </td>

                      {/* SSL */}
                      <td className="py-2.5 px-3">
                        {dom.sslStatus === 'issued' ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px]">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>ISSUED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>PENDING</span>
                          </span>
                        )}
                      </td>

                      {/* DNS */}
                      <td className="py-2.5 px-3 font-mono">
                        {dom.dnsStatus === 'verified' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>CNAME Verified</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-600 dark:text-amber-400 text-[11px]">
                            <AlertCircle className="w-3 h-3" />
                            <span>CNAME Missing</span>
                          </span>
                        )}
                      </td>

                      {/* CNAME Ingress Target */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 dark:text-[#9aa0a6]">
                        {dom.cnameTarget}
                      </td>

                      {/* Created */}
                      <td className="py-2.5 px-3 text-gray-500 dark:text-[#9aa0a6] text-[11px] whitespace-nowrap">
                        {format(dom.createdAt, 'MMM dd, yyyy')}
                      </td>

                      {/* Controls */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleVerifyDns(dom)}
                            disabled={isBusy}
                            className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <RefreshCw className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
                            <span>Verify DNS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRevokeDomain(dom)}
                            disabled={isBusy}
                            className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Release</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
