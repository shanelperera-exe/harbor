import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { Loader2, Copy, Database, CheckCircle, XCircle, Clock, Calendar, CalendarDays, Layers, Circle, ArrowDownUp } from 'lucide-react';
import { format } from 'date-fns';
import { IoLogoGithub } from "react-icons/io";
import { LuExternalLink, LuRefreshCcw } from "react-icons/lu";
import { MdPublic } from "react-icons/md";
import { BiSolidBolt } from "react-icons/bi";
import { VscDeveloperTools } from 'react-icons/vsc';
import { IoEyeOutline } from 'react-icons/io5';
import { FaCode } from 'react-icons/fa6';
import { FiChevronDown } from 'react-icons/fi';
import { motion } from 'motion/react';
import { MdFiberNew } from 'react-icons/md';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { getDeploymentHistory, type Deployment, mapDeployStatus } from '../../services/deploymentService';
import { DeployModal } from './ServiceDetails';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Icon } from '../../components/icons';

const POLL_INTERVAL_MS = 5000;

// Active states that require polling
const ACTIVE_STATUSES = new Set(['pending', 'running', 'queued']);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

const getEnvironmentColor = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

function duration(deploy: Deployment): string {
  if (!deploy.completedAt || !deploy.startedAt) return '—';
  const ms = new Date(deploy.completedAt).getTime() - new Date(deploy.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}


// ─── Main Component ────────────────────────────────────────────────────────────
export default function ServiceDeploys() {
  const { projectId, serviceId } = useParams();
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deployRefreshKey = 0 } = context ?? {};
  const service = context?.service;
  const navigate = useNavigate();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [deployMode, setDeployMode] = useState<'latest' | 'specific'>('latest');
  const deployMenuRef = useRef<HTMLDivElement>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fetchDeployments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (!serviceId) return;
      const result = await getDeploymentHistory({ serviceId, page: 1, pageSize: 100 });
      setDeployments(result.items);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceId]);

  // Initial fetch + re-fetch when a deploy is triggered (refreshKey changes)
  useEffect(() => {
    fetchDeployments(false);
  }, [fetchDeployments, deployRefreshKey]);

  // Auto-poll when any deployment is in an active state
  useEffect(() => {
    const hasActive = deployments.some((d) => isActive(d.status));
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (hasActive) {
      pollRef.current = setInterval(() => fetchDeployments(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deployments, fetchDeployments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deployMenuRef.current && !deployMenuRef.current.contains(event.target as Node)) {
        setDeployMenuOpen(false);
      }
    };
    if (deployMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [deployMenuOpen]);

  const filterByDate = (d: Deployment) => {
    if (!dateRange) return true;
    const started = new Date(d.startedAt).getTime();
    const now = Date.now();
    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return started >= today.getTime();
    }
    if (dateRange === '7days') {
      return started >= now - 7 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === '30days') {
      return started >= now - 30 * 24 * 60 * 60 * 1000;
    }
    if (dateRange === 'custom') {
      const start = customStartDate ? new Date(customStartDate).getTime() : 0;
      const end = customEndDate ? new Date(customEndDate).getTime() + 86400000 : Infinity;
      return started >= start && started <= end;
    }
    return true;
  };

  const sortDeployments = (a: Deployment, b: Deployment) => {
    if (sortBy === 'oldest') {
      return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
    }
    if (sortBy === 'duration') {
      const durA = a.completedAt && a.startedAt ? new Date(a.completedAt).getTime() - new Date(a.startedAt).getTime() : 0;
      const durB = b.completedAt && b.startedAt ? new Date(b.completedAt).getTime() - new Date(b.startedAt).getTime() : 0;
      return durB - durA;
    }
    // default 'newest'
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  };

  const filteredDeployments = deployments
    .filter((d) => {
      if (selectedEnv && d.environment?.toLowerCase() !== selectedEnv.toLowerCase()) {
        return false;
      }
      if (selectedStatus && d.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      if (!filterByDate(d)) {
        return false;
      }
      if (!search) return true;
      const q = search.toLowerCase();
      const hashStr = (d.hash || (d.publicId ? d.publicId.replace('dep-', '') : d.id.toString())).toLowerCase();
      return (
        (d.commitSha && d.commitSha.toLowerCase().includes(q)) ||
        (d.version && d.version.toLowerCase().includes(q)) ||
        (d.environment && d.environment.toLowerCase().includes(q)) ||
        hashStr.includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    })
    .sort(sortDeployments);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredDeployments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedDeployments = filteredDeployments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const latestDeployed =
    [...deployments]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .find((d) => d.status?.toLowerCase() === 'succeeded') || null;
  const deployedBranch = latestDeployed?.workflowRef || service?.repositoryBranch || 'main';
  const deployedCommitSha = latestDeployed?.commitSha || null;

  const dateOptions = [
    { value: '', label: 'All time', icon: Calendar },
    { value: 'today', label: 'Today', icon: Clock },
    { value: '7days', label: 'Last 7 days', icon: CalendarDays },
    { value: '30days', label: 'Last 30 days', icon: CalendarDays },
    { value: 'custom', label: 'Custom range...', icon: Calendar },
  ];

  const envOptions = [
    { value: '', label: 'All environments', icon: Layers },
    { value: 'Production', label: 'Production', icon: BiSolidBolt },
    { value: 'Preview', label: 'Preview', icon: IoEyeOutline },
    { value: 'Staging', label: 'Staging', icon: VscDeveloperTools },
    { value: 'Development', label: 'Development', icon: FaCode },
  ];

  const statusOptions = [
    { value: '', label: 'All statuses', icon: Circle },
    { value: 'Succeeded', label: 'Succeeded', icon: CheckCircle },
    { value: 'Failed', label: 'Failed', icon: XCircle },
    { value: 'Running', label: 'Running', icon: Loader2 },
    { value: 'Pending', label: 'Pending', icon: Clock },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest first', icon: ArrowDownUp },
    { value: 'oldest', label: 'Oldest first', icon: ArrowDownUp },
    { value: 'duration', label: 'Duration', icon: Clock },
  ];

  const dropdownClass = "flex items-center justify-between gap-2 h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors min-w-[160px]";

  return (
    <div className="flex flex-col w-full">
      {/* Deploy Modal */}
      {isDeployModalOpen && service && projectId && (
        <DeployModal
          service={service}
          projectId={projectId}
          mode={deployMode}
          latestCommitSha={deployments.find(d => d.commitSha)?.commitSha || undefined}
          onClose={() => setIsDeployModalOpen(false)}
          onDeployed={() => {
            fetchDeployments(true);
          }}
        />
      )}

      {/* Header Area */}
      {service && (
        <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
          <header className="px-4 md:px-12 space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider font-mono">
              {service.type === 'static' ? (
                <Icon name="staticSite" className="shrink-0 w-4 h-4" />
              ) : service.type === 'db' ? (
                <Database className="w-4 h-4" />
              ) : (
                <Icon name="globe" className="shrink-0 w-4 h-4" />
              )}
              <span>{service.type === 'static' ? 'Static Site' : service.type === 'web' ? 'Web Service' : service.type === 'db' ? 'Database' : 'Service'}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-y-4">
              <div className="flex-1 min-w-0">
                 <h1 className="flex flex-wrap items-center gap-4 text-5xl font-medium text-gray-900 dark:text-white pr-4">
                  <div className="min-w-0 break-words">{service.name}</div>
                </h1>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0 text-base" ref={deployMenuRef}>
                <div className="relative inline-block text-left z-[100]">
                  <button
                    onClick={() => setDeployMenuOpen(!deployMenuOpen)}
                    className="h-10 px-4 flex items-center justify-between gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium border border-transparent transition-colors rounded-sm min-w-[170px]"
                  >
                    <span className="flex-1 text-center">Manual Deploy</span>
                    <motion.span animate={{ rotate: deployMenuOpen ? 180 : 0 }} className="shrink-0">
                      <FiChevronDown className="w-4 h-4" />
                    </motion.span>
                  </button>

                  <motion.ul
                    initial={deployMenuOpen ? "open" : "closed"}
                    animate={deployMenuOpen ? "open" : "closed"}
                    variants={{
                      open: { scaleY: 1, opacity: 1, transition: { duration: 0.2 } },
                      closed: { scaleY: 0, opacity: 0, transition: { duration: 0.2 } }
                    }}
                    style={{ originY: "top" }}
                    className="flex flex-col p-1.5 rounded-sm bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] absolute top-[120%] right-0 min-w-[220px] overflow-hidden z-[100] shadow-lg shadow-black/5 dark:shadow-black/20"
                  >
                    <li
                      onClick={() => {
                        setDeployMode('latest');
                        setDeployMenuOpen(false);
                        setIsDeployModalOpen(true);
                      }}
                      className="flex items-center gap-2 p-2 text-sm font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#252525] rounded-sm transition-colors cursor-pointer"
                    >
                      <MdFiberNew className="w-4 h-4 text-gray-500" />
                      Deploy latest commit
                    </li>
                    <li
                      onClick={() => {
                        setDeployMode('specific');
                        setDeployMenuOpen(false);
                        setIsDeployModalOpen(true);
                      }}
                      className="flex items-center gap-2 p-2 text-sm font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#252525] rounded-sm transition-colors cursor-pointer mt-1"
                    >
                      <Icon name="gitCommit" className="w-4 h-4 text-gray-500 shrink-0" data-slot="geist-icon" />
                      Deploy a specific commit
                    </li>
                  </motion.ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 text-base pb-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[15px]">
                  <span className="text-gray-500 dark:text-[#8f8f8f]">Service ID:</span>
                  <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                    {service.publicId || service.id}
                    <button onClick={() => copyToClipboard(service.publicId || service.id.toString())} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                  <span className="inline-flex items-center max-w-full">
                    <span className="translate-y-px mr-1.5 shrink-0">
                      <IoLogoGithub className="flex-shrink-0 w-5 h-5 text-gray-900 dark:text-white" aria-label="GitHub" />
                    </span>
                      <span className="group inline-flex items-center min-w-0 flex-shrink text-gray-900 dark:text-white">
                        <span className="inline-flex items-center type-body-01 max-w-full">
                          <a rel="noopener noreferrer" target="_blank" href={service.repositoryUrl || '#'} className="hover:underline">
                          <span className="truncate min-w-0 flex-shrink">
                            {(() => {
                              const repoStr = service.repositoryName || 'portfolio';
                              const repoParts = repoStr.split('/');
                              const repoOwner = repoParts.length > 1 ? repoParts[0] : (service.repositoryOwner || 'shanelperera-exe');
                              const repoName = repoParts.length > 1 ? repoParts[1] : repoStr;
                              return `${repoOwner} / ${repoName}`;
                            })()}
                          </span>
                        </a>
                        <span className="flex items-center ml-1.5 mr-6">
                          {service.isPrivate ? (
                            <Icon name="lock" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" />
                          ) : (
                            <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mr-6">
                          <Icon name="gitBranch" className="flex-none text-gray-900 dark:text-white" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          <a rel="noopener noreferrer" target="_blank" href={`${service.repositoryUrl}/tree/${deployedBranch}`} className="hover:underline">
                            <span className="truncate min-w-0 flex-shrink" style={{ fontFamily: 'Geist, sans-serif' }}>{deployedBranch}</span>
                          </a>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Icon name="gitCommit" className="shrink-0 text-gray-900 dark:text-white" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          {deployedCommitSha ? (
                            <a
                              rel="noopener noreferrer"
                              target="_blank"
                              href={`${service.repositoryUrl}/commit/${deployedCommitSha}`}
                              className="hover:underline"
                            >
                              <span className="truncate min-w-0 flex-shrink font-mono text-[14px] text-gray-900 dark:text-white">{deployedCommitSha.substring(0, 7)}</span>
                            </a>
                          ) : (
                            <span className="text-[14px] text-gray-500 dark:text-[#8f8f8f]">-</span>
                          )}
                        </div>
                      </span>
                    </span>
                  </span>
                </div>
                
                {service.deploymentUrls && service.deploymentUrls.length > 0 ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {service.deploymentUrls.map((dUrl: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                        <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
                        <span>Deployment URL ({dUrl.environment}):</span>
                        <a href={dUrl.url ? (dUrl.url.startsWith('http') ? dUrl.url : `https://${dUrl.url}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          {dUrl.url || 'No URL available'}
                          <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                    <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
                    <span>Deployment URL (Production):</span>
                    <a href={service.deploymentUrl ? (service.deploymentUrl.startsWith('http') ? service.deploymentUrl : `https://${service.deploymentUrl}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      {service.deploymentUrl || 'No URL available'}
                      <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>
      )}

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
      {/* Deployments Title */}
      <h2 className="flex items-center justify-end gap-4 text-3xl font-medium text-gray-900 dark:text-white">
        <Icon name="deploy" className="w-8 h-8" aria-hidden="true" />
        Deployments
      </h2>

      {/* Search + Filters Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search deploys, commits, branches…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full h-10 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm pl-10 pr-4 text-sm font-[Geist] focus:border-[#2563eb] focus:ring-0 focus:outline-none dark:text-white transition-colors"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8f8f8f]">
              <Icon name="search" />
            </div>
          </div>

          {/* Filter by Date Range */}
          <FilterDropdown
            value={dateRange}
            onChange={(v) => { setDateRange(v); setPage(1); }}
            options={dateOptions}
            placeholder="All time"
            className={dropdownClass}
          />

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => { setCustomStartDate(e.target.value); setPage(1); }}
                className="h-10 px-2 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors focus:border-[#2563eb] focus:outline-none" 
              />
              <span className="text-gray-500 text-sm">to</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => { setCustomEndDate(e.target.value); setPage(1); }}
                className="h-10 px-2 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors focus:border-[#2563eb] focus:outline-none" 
              />
            </div>
          )}

          {/* Filter by Environment */}
          <FilterDropdown
            value={selectedEnv}
            onChange={(v) => { setSelectedEnv(v); setPage(1); }}
            options={envOptions}
            placeholder="All environments"
            className={dropdownClass}
          />

          {/* Filter by Status */}
          <FilterDropdown
            value={selectedStatus}
            onChange={(v) => { setSelectedStatus(v); setPage(1); }}
            options={statusOptions}
            placeholder="All statuses"
            className={dropdownClass}
          />

          {/* Sort Option */}
          <FilterDropdown
            value={sortBy}
            onChange={(v) => { setSortBy(v); setPage(1); }}
            options={sortOptions}
            placeholder="Sort by"
            className={dropdownClass}
          />

          {/* Refresh Button */}
          <button
            onClick={() => fetchDeployments(true)}
            title="Refresh"
            className="h-10 w-10 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <LuRefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Deploys List */}
      <div>
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading deployments…</span>
            </div>
          ) : filteredDeployments.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-[#6b6b6b]">
              {search ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No matches for "{search}"</div>
                  <div className="text-xs">Try a different search term.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No deployments yet</div>
                  <div className="text-xs">Click "Manual Deploy" to trigger your first deployment.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
              {/* Header */}
              <div className="flex flex-row items-center gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  Deployment
                  <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                    {filteredDeployments.length}
                  </span>
                </div>
                <div className="w-[100px] shrink-0">ID</div>
                <div className="w-[120px] shrink-0">Status</div>
                <div className="w-[120px] shrink-0">Environment</div>
                <div className="w-[100px] shrink-0">Commit</div>
                <div className="w-[140px] shrink-0">Branch</div>
                <div className="w-[120px] shrink-0 text-right">Time</div>
              </div>

              {paginatedDeployments.map((deploy, index) => {
                const mappedStatus = mapDeployStatus(deploy.status);
                
                return (
                  <div 
                    key={deploy.id} 
                    onClick={() => navigate(`/projects/${projectId}/services/${serviceId}/deployments/${deploy.publicId || deploy.id}`)}
                    className={`group/deployment-row relative flex flex-row items-center gap-8 cursor-pointer bg-transparent transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] px-4 h-[56px] ${index !== paginatedDeployments.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''}`}
                  >

                    {/* Column 1: Deployment Name */}
                    <div className="flex-1 min-w-0 flex items-center z-20">
                      <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-[Geist] font-medium">
                        {deploy.commitMessage || deploy.version || 'Manual Deploy'}
                      </span>
                    </div>

                    {/* Column 2: Deployment Hash */}
                    <div className="w-[100px] shrink-0 z-20">
                      <span className="text-[14px] text-gray-900 dark:text-white font-mono truncate">
                        {deploy.hash || (deploy.publicId ? deploy.publicId.replace('dep-', '').substring(0, 9) : deploy.id)}
                      </span>
                    </div>

                    {/* Column 3: Status & Duration */}
                    <div className="w-[120px] flex items-center gap-2 shrink-0 z-20 text-[14px] font-[Geist]">
                      <StatusBadge status={mappedStatus.type} label={mappedStatus.label} />
                      <span className="text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {duration(deploy)}
                      </span>
                    </div>

                    {/* Column 4: Environment (Domain) */}
                    <div className="w-[120px] shrink-0 z-20">
                      <span className={`inline-flex items-center justify-center rounded-md font-[Geist] font-medium h-[24px] px-2.5 text-[13px] ${getEnvironmentColor(deploy.environment || 'Production')}`}>
                        {(deploy.environment || 'Production').toLowerCase() === 'production' ? (
                          <BiSolidBolt className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                        ) : (
                          <Icon name="environmentBurst" className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                        )}
                        {deploy.environment || 'Production'}
                      </span>
                    </div>

                    {/* Column 5: Commit */}
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {deploy.commitSha ? (
                        <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/commit/${deploy.commitSha}` : "#"} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          </span>
                          <span className="whitespace-nowrap">{deploy.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 6: Branch */}
                    <div className="w-[140px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {service.repositoryBranch ? (
                        <a href={`${service.repositoryUrl}/tree/${service.repositoryBranch}`} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1.5 text-[14px] font-mono truncate hover:underline cursor-pointer">
                          <Icon name="gitBranch" className="flex-none" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          {service.repositoryBranch}
                        </a>
                      ) : (
                        <span className="text-[14px] font-mono text-gray-900 dark:text-white">-</span>
                      )}
                    </div>

                    {/* Column 7: Date and Time */}
                    <div className="w-[120px] shrink-0 z-20 text-[14px] text-gray-900 dark:text-white font-[Geist] text-right whitespace-nowrap">
                      {format(new Date(deploy.startedAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Bar */}
              {filteredDeployments.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 border-t border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.02] text-xs font-[Geist]">
                  <div className="text-gray-500 dark:text-[#8f8f8f]">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{(safePage - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.min(safePage * PAGE_SIZE, filteredDeployments.length)}
                    </span>{' '}
                    of <span className="font-medium text-gray-900 dark:text-white">{filteredDeployments.length}</span> deployment{filteredDeployments.length === 1 ? '' : 's'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-sm border border-gray-300 dark:border-[#525252] font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#202020] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                      .reduce<(number | string)[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                          acc.push('...');
                        }
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) => {
                        if (typeof item === 'string') {
                          return (
                            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 dark:text-[#6b6b6b]">
                              ...
                            </span>
                          );
                        }
                        return (
                          <button
                            key={item}
                            onClick={() => setPage(item)}
                            className={`w-7 h-7 flex items-center justify-center rounded-sm text-xs font-medium transition-colors ${
                              safePage === item
                                ? 'bg-[#2563eb] text-white border border-[#2563eb]'
                                : 'border border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#202020]'
                            }`}
                          >
                            {item}
                          </button>
                        );
                      })}

                    <button
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-sm border border-gray-300 dark:border-[#525252] font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#202020] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
