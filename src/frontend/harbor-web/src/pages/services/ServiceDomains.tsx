import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Globe, Check, Copy, Trash2, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
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

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionTitle
            icon={<Icon name="globe" />}
            title="Domains"
            description="Manage custom domains, assigned environments, and DNS records for this service."
          />
          <button
            onClick={() => {
              setIsAddModalOpen(true);
              setModalError(null);
            }}
            className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-[Geist] font-medium text-sm rounded-sm transition-colors shadow-sm self-start sm:self-auto shrink-0"
          >
            <Icon name="plus" className="w-4 h-4" />
            <span>Add Domain</span>
          </button>
        </div>

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
          <div className="flex flex-col gap-6">
            {domains.map((item) => {
              const fullUrl = item.domain.startsWith('http') ? item.domain : `https://${item.domain}`;
              return (
                <div
                  key={item.id}
                  className="p-6 page-primary border border-solid border-gray-300 dark:border-[#525252] rounded-sm flex flex-col gap-5 transition-colors"
                >
                  {/* Domain Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <a
                          href={fullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[17px] font-medium text-gray-950 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline flex items-center gap-1.5 truncate"
                        >
                          <span>{item.domain}</span>
                          <ExternalLink className="w-4 h-4 text-gray-400 dark:text-[#777] shrink-0" />
                        </a>

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

                        <span className="inline-flex items-center px-2 py-0.5 rounded-xs text-[11px] font-medium bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-[#bbb] border border-gray-200 dark:border-[#383838]">
                          {item.environment}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {item.status.toLowerCase() === 'active' ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Active · SSL Configured</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>Pending DNS Verification</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!item.isSystem && item.status.toLowerCase() !== 'active' && (
                        <button
                          onClick={() => handleVerify(item.id)}
                          disabled={verifyingId === item.id}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-800 dark:text-[#ddd] rounded-sm transition-colors border border-gray-200 dark:border-[#404040]"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingId === item.id ? 'animate-spin' : ''}`} />
                          <span>Check DNS</span>
                        </button>
                      )}

                      {!item.isPrimary && !item.isSystem && (
                        <button
                          onClick={() => handleSetPrimary(item.id)}
                          disabled={settingPrimaryId === item.id}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-700 dark:text-[#ccc] hover:bg-gray-100 dark:hover:bg-white/[0.06] rounded-sm transition-colors border border-gray-200 dark:border-[#404040]"
                        >
                          <span>Set Primary</span>
                        </button>
                      )}

                      {!item.isSystem && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-sm transition-colors"
                          title="Remove domain"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* DNS Instructions Card (if custom domain) */}
                  {!item.isSystem && (
                    <div className="pt-4 border-t border-gray-200 dark:border-[#383838] flex flex-col gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-[#888]">
                        Required DNS Configuration
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 dark:bg-[#161616] border border-gray-200 dark:border-[#333] rounded-sm p-3 text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500 dark:text-[#777]">Type</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{item.dnsType}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500 dark:text-[#777]">Host / Name</span>
                          <span className="font-mono font-medium text-gray-900 dark:text-white">{item.dnsHost}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-500 dark:text-[#777]">Value / Target</span>
                          <div className="flex items-center justify-between gap-2 font-mono text-gray-900 dark:text-white">
                            <span className="truncate">{item.dnsTarget}</span>
                            <button
                              onClick={() => handleCopy(item.dnsTarget, `target-${item.id}`)}
                              className="text-gray-400 hover:text-blue-500 p-0.5 rounded transition-colors"
                              title="Copy target"
                            >
                              {copiedKey === `target-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
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
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] rounded-sm w-full max-w-md overflow-hidden shadow-2xl">
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
