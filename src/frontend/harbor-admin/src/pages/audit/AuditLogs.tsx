import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Info, 
  AlertTriangle, 
  ShieldAlert,
  Server
} from 'lucide-react';
import { fetchAuditLogs, type AuditLogEntry } from '../../services/auditService';
import { format, formatDistanceToNow } from '../../utils/dateUtils';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogs();
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(entry => {
      const matchesSearch = 
        entry.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.target.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = severityFilter === 'all' || entry.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [logs, searchQuery, severityFilter]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `harbor_audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getSeverityBadge = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'info':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 font-mono text-[10px]">
            <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            <span>INFO</span>
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-mono text-[10px]">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>WARN</span>
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-mono text-[10px]">
            <ShieldAlert className="w-3 h-3 text-red-600 dark:text-red-400" />
            <span>CRITICAL</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Platform Governance & Audit Logs
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-[#2c2d30] border border-gray-300 dark:border-[#3c4043] text-gray-600 dark:text-[#bdc1c6]">
              Immutable Stream
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Security audit trail, operator privilege elevations, cluster reconfigurations, and security events.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

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
      </div>

      {/* Filter and search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 my-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search actor, action type, IP address, or target..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9aa0a6]"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-800 dark:text-gray-200 focus:outline-none"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50/75 dark:bg-[#28292c] text-gray-600 dark:text-[#9aa0a6] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor / Origin</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Severity</th>
                <th className="py-2.5 px-3">Target Resource</th>
                <th className="py-2.5 px-3">Client IP</th>
                <th className="py-2.5 px-3">Context & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading platform audit log stream...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-gray-50/80 dark:hover:bg-[#27282b] transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 dark:text-[#9aa0a6] whitespace-nowrap">
                      {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                      <span className="block text-[10px] text-gray-400">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-2.5 px-3 font-mono text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Server className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{log.actor}</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-800 dark:text-[#bdc1c6]">
                      <span className="px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-[#3c4043]">
                        {log.action}
                      </span>
                    </td>

                    {/* Severity */}
                    <td className="py-2.5 px-3">
                      {getSeverityBadge(log.severity)}
                    </td>

                    {/* Target */}
                    <td className="py-2.5 px-3 text-gray-700 dark:text-[#bdc1c6]">
                      {log.target}
                    </td>

                    {/* IP */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-gray-500 dark:text-[#9aa0a6]">
                      {log.ipAddress}
                    </td>

                    {/* Details */}
                    <td className="py-2.5 px-3 text-gray-600 dark:text-[#9aa0a6] text-[11px]">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
