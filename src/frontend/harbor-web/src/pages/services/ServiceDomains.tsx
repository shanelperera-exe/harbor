import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Globe, Check, Copy, Trash2, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { LuExternalLink } from 'react-icons/lu';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';
import {
  getServiceDomains,
  addServiceDomain,
  deleteServiceDomain,
  verifyServiceDomain,
  setPrimaryServiceDomain,
  type ServiceDomain
} from '../../services/domainService';

const getEnvironmentColor = (env: string) => {
  const e = (env || '').toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

export default function ServiceDomains() {
  const { projectId, serviceId } = useParams();

  const [domains, setDomains] = useState<ServiceDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Domain Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newEnvironment, setNewEnvironment] = useState('Production');
  const [addingDomain, setAddingDomain] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Verifying / Action states
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    if (!projectId || !serviceId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getServiceDomains(projectId, serviceId);
      setDomains(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load domains.');
    } finally {
      setLoading(false);
    }
  }, [projectId, serviceId]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !serviceId) return;
    if (!newDomain.trim()) {
      setModalError('Please enter a domain name.');
      return;
    }

    try {
      setAddingDomain(true);
      setModalError(null);
      await addServiceDomain(projectId, serviceId, {
        domain: newDomain.trim(),
        environment: newEnvironment,
      });
      setNewDomain('');
      setIsAddModalOpen(false);
      await fetchDomains();
    } catch (err: any) {
      setModalError(err.message || 'Failed to add domain.');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleDelete = async (domainId: number) => {
    if (!projectId || !serviceId) return;
    if (!window.confirm('Are you sure you want to remove this domain?')) return;

    try {
      setDeletingId(domainId);
      await deleteServiceDomain(projectId, serviceId, domainId);
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || 'Failed to delete domain.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerify = async (domainId: number) => {
    if (!projectId || !serviceId) return;
    try {
      setVerifyingId(domainId);
      const res = await verifyServiceDomain(projectId, serviceId, domainId);
      if (res.verified) {
        await fetchDomains();
      } else {
        alert('DNS records not detected yet. DNS propagation may take a few minutes.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to verify DNS.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (domainId: number) => {
    if (!projectId || !serviceId) return;
    try {
      setSettingPrimaryId(domainId);
      await setPrimaryServiceDomain(projectId, serviceId, domainId);
      await fetchDomains();
    } catch (err: any) {
      alert(err.message || 'Failed to set as primary domain.');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <ServiceHeader />

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
        <SectionTitle
          icon={<Icon name="globe" />}
          title="Domains"
          description="Manage custom domains, assigned environments, and DNS records for this service."
          actions={
            <button
              onClick={() => {
                setIsAddModalOpen(true);
                setModalError(null);
              }}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-[Geist] font-medium text-sm rounded-sm transition-colors"
            >
              <Icon name="plus" className="w-4 h-4" />
              <span>Add Domain</span>
            </button>
          }
        />

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-sm flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
          </div>
        ) : domains.length === 0 ? (
          <div className="border border-dashed border-gray-300 dark:border-[#525252] rounded-sm p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-white/[0.04] flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No custom domains configured</h3>
            <p className="text-sm text-gray-500 dark:text-[#a1a1aa] max-w-md">
              Connect a custom domain to make your service accessible at your own branded URL.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 h-9 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.12] text-gray-800 dark:text-white text-sm font-medium rounded-sm transition-colors"
            >
              <Icon name="plus" className="w-3.5 h-3.5" />
              <span>Add your first domain</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
            {/* Table Header Row (Log rows aesthetic) */}
            <div className="flex flex-row items-center gap-4 xl:gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-5 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
              <div className="flex-1 min-w-[240px] flex items-center gap-2">
                Domain & Routing
                <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                  {domains.length}
                </span>
              </div>
              <div className="w-[180px] shrink-0 hidden sm:block">Status & SSL</div>
              <div className="w-[130px] shrink-0 hidden md:block">Environment</div>
              <div className="w-[180px] shrink-0 text-right">Actions</div>
            </div>

            {/* Domains Rows */}
            {domains.map((item, index) => {
              const fullUrl = item.domain.startsWith('http') ? item.domain : `https://${item.domain}`;
              const isActive = item.status.toLowerCase() === 'active';

              return (
                <div
                  key={item.id}
                  className={`group/domain-row flex flex-col transition-colors bg-transparent hover:bg-gray-50/70 dark:hover:bg-white/[0.02] ${
                    index !== domains.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''
                  }`}
                >
                  {/* Primary Row */}
                  <div className="flex flex-row items-center gap-4 xl:gap-8 px-5 min-h-[58px] py-2.5">
                    {/* Domain & Badges */}
                    <div className="flex-1 min-w-[240px] flex items-center gap-2.5 flex-wrap">
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[15px] font-medium text-gray-900 dark:text-[#ededed] hover:text-[#2563eb] dark:hover:text-[#3b82f6] hover:underline inline-flex items-center gap-1.5"
                        >
                          <span className="font-[Geist] font-medium">{item.domain}</span>
                          <LuExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-[#777] shrink-0" />
                        </a>
                      </div>

                      {item.isPrimary && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                          Primary
                        </span>
                      )}

                      {item.isSystem ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-[#aaa] border border-gray-200 dark:border-[#404040]">
                          System / Provider URL
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
                          Custom Domain
                        </span>
                      )}

                      <span className="sm:hidden inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-medium bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-[#bbb] border border-gray-200 dark:border-[#383838]">
                        {item.environment}
                      </span>
                    </div>

                    {/* Status & SSL */}
                    <div className="w-[180px] shrink-0 hidden sm:flex items-center">
                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>Active · SSL Configured</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Pending DNS Verification</span>
                        </div>
                      )}
                    </div>

                    {/* Environment */}
                    <div className="w-[130px] shrink-0 hidden md:flex items-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-xs font-[Geist] font-medium h-[22px] px-2 text-[12px] ${getEnvironmentColor(
                          item.environment
                        )}`}
                      >
                        {item.environment}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="w-[180px] shrink-0 flex items-center justify-end gap-2">
                      {!item.isSystem && !isActive && (
                        <button
                          onClick={() => handleVerify(item.id)}
                          disabled={verifyingId === item.id}
                          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-800 dark:text-[#ddd] rounded-sm transition-colors border border-gray-200 dark:border-[#404040]"
                        >
                          <RefreshCw className={`w-3 h-3 ${verifyingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Check DNS</span>
                        </button>
                      )}

                      {!item.isPrimary && !item.isSystem && (
                        <button
                          onClick={() => handleSetPrimary(item.id)}
                          disabled={settingPrimaryId === item.id}
                          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-gray-700 dark:text-[#ccc] hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-sm transition-colors border border-gray-200 dark:border-[#404040]"
                        >
                          <span>Set Primary</span>
                        </button>
                      )}

                      {!item.isSystem && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="h-7 w-7 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-sm transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Secondary Technical DNS Block (Structured like log row data) */}
                  {!item.isSystem ? (
                    <div className="mx-5 mb-3.5 p-2.5 bg-gray-50/80 dark:bg-[#0d1424]/70 border border-gray-200 dark:border-[#333] rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-geist-mono">
                      <div className="flex items-center gap-2 text-gray-500 dark:text-[#888] font-sans font-medium uppercase tracking-wider text-[11px] shrink-0">
                        <Icon name="sliders" className="w-3.5 h-3.5 text-gray-400" />
                        <span>Required DNS Configuration</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 md:gap-5 text-[12px] font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 dark:text-[#777]">Type</span>
                          <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 text-gray-900 dark:text-white rounded-xs border border-gray-200 dark:border-white/10 font-medium">
                            {item.dnsType || 'A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 dark:text-[#777]">Host / Name</span>
                          <span className="px-1.5 py-0.5 bg-white dark:bg-white/10 text-gray-900 dark:text-white rounded-xs border border-gray-200 dark:border-white/10 font-medium">
                            {item.dnsHost || '@'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 dark:text-[#777]">Value / Target</span>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-white/10 text-gray-900 dark:text-white rounded-xs border border-gray-200 dark:border-white/10">
                            <span className="select-all">{item.dnsTarget || '76.76.21.21'}</span>
                            <button
                              onClick={() => handleCopy(item.dnsTarget || '76.76.21.21', `target-${item.id}`)}
                              className="text-gray-400 hover:text-blue-500 ml-1 p-0.5 rounded transition-colors"
                              title="Copy target"
                            >
                              {copiedKey === `target-${item.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mx-5 mb-3.5 px-3 py-2 bg-gray-50/50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 rounded-sm flex items-center justify-between text-xs text-gray-500 dark:text-[#888] font-geist-mono">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span>Edge Routing · Managed wildcard SSL · Canonical upstream target</span>
                      </span>
                      <span className="text-[11px] uppercase tracking-wider text-gray-400 hidden sm:inline">Provider Assigned</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Domain Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] rounded-sm w-full max-w-md overflow-hidden">
              <form onSubmit={handleAddDomain}>
                <div className="p-6 border-b border-gray-200 dark:border-[#333] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white font-[Geist]">Add Custom Domain</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 flex flex-col gap-4 font-[Geist]">
                  {modalError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-sm text-xs text-red-600 dark:text-red-400">
                      {modalError}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-[#aaa]">
                      Domain Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. portfolio.shanelperera.me"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-blue-500 focus:outline-none dark:text-white text-sm font-mono placeholder:text-gray-400 dark:placeholder-[#666]"
                      autoFocus
                    />
                    <span className="text-[11px] text-gray-500 dark:text-[#888]">
                      Enter a root domain (e.g. example.com) or subdomain (e.g. app.example.com).
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-[#aaa]">
                      Target Environment
                    </label>
                    <select
                      value={newEnvironment}
                      onChange={(e) => setNewEnvironment(e.target.value)}
                      className="h-10 px-3 bg-white dark:bg-[#202020] border border-gray-300 dark:border-[#525252] rounded-sm focus:border-blue-500 focus:outline-none text-gray-900 dark:text-white text-sm"
                    >
                      <option value="Production">Production</option>
                      <option value="Preview">Preview</option>
                      <option value="Staging">Staging</option>
                    </select>
                  </div>

                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-sm flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Automatic SSL certificates are provisioned once DNS propagation is verified.
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-200 dark:border-[#333] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="h-9 px-4 text-xs font-medium text-gray-700 dark:text-[#ccc] hover:bg-gray-100 dark:hover:bg-white/[0.08] rounded-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingDomain}
                    className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-sm transition-colors disabled:opacity-50"
                  >
                    {addingDomain && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Add Domain</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
