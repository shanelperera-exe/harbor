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
                <svg fill="currentColor" className="shrink-0 w-4 h-4" width="16" height="17" viewBox="0 0 16 17"><path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path><path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path></svg>
              ) : service.type === 'db' ? (
                <Database className="w-4 h-4" />
              ) : (
                <svg fill="currentColor" className="shrink-0 w-4 h-4" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
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
                      <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="w-4 h-4 text-gray-500 shrink-0"><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
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
                            <svg fill="currentColor" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M12 7.51172H11V4.51172C11 3.71607 10.6839 2.95301 10.1213 2.3904C9.55871 1.82779 8.79565 1.51172 8 1.51172C7.20435 1.51172 6.44129 1.82779 5.87868 2.3904C5.31607 2.95301 5 3.71607 5 4.51172V7.51172H4C3.73478 7.51172 3.48043 7.61708 3.29289 7.80461C3.10536 7.99215 3 8.2465 3 8.51172V14.5117C3 14.7769 3.10536 15.0313 3.29289 15.2188C3.48043 15.4064 3.73478 15.5117 4 15.5117H12C12.2652 15.5117 12.5196 15.4064 12.7071 15.2188C12.8946 15.0313 13 14.7769 13 14.5117V8.51172C13 8.2465 12.8946 7.99215 12.7071 7.80461C12.5196 7.61708 12.2652 7.51172 12 7.51172ZM6 4.51172C6 3.98129 6.21071 3.47258 6.58579 3.09751C6.96086 2.72243 7.46957 2.51172 8 2.51172C8.53043 2.51172 9.03914 2.72243 9.41421 3.09751C9.78929 3.47258 10 3.98129 10 4.51172V7.51172H6V4.51172ZM4 8.51172H12V14.5117H4V8.51172Z"></path></svg>
                          ) : (
                            <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 mr-6">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="flex-none text-gray-900 dark:text-white" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
                          <a rel="noopener noreferrer" target="_blank" href={`${service.repositoryUrl}/tree/${deployedBranch}`} className="hover:underline">
                            <span className="truncate min-w-0 flex-shrink" style={{ fontFamily: 'Geist, sans-serif' }}>{deployedBranch}</span>
                          </a>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0 text-gray-900 dark:text-white" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
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
                        <svg fill="currentColor" aria-hidden="true" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" width="16" height="16" viewBox="0 0 16 16"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
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
                    <svg fill="currentColor" aria-hidden="true" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" width="16" height="16" viewBox="0 0 16 16"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
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
        <svg fill="currentColor" aria-hidden="true" className="w-8 h-8" viewBox="0 0 16 16"><path d="M11.5 1L8.5 4L9.2073 4.70115L11 2.9092V14H3V6H2V14C2.00033 14.2651 2.10579 14.5193 2.29326 14.7067C2.48072 14.8942 2.73489 14.9997 3 15H11C11.2651 14.9997 11.5193 14.8942 11.7067 14.7067C11.8942 14.5193 11.9997 14.2651 12 14V2.9077L13.7929 4.70115L14.5 4L11.5 1Z"></path><path d="M8 12H6C5.73488 11.9997 5.4807 11.8942 5.29323 11.7068C5.10576 11.5193 5.0003 11.2651 5 11V9C5.0003 8.73488 5.10576 8.4807 5.29323 8.29323C5.4807 8.10576 5.73488 8.0003 6 8H8C8.26512 8.0003 8.5193 8.10576 8.70677 8.29323C8.89424 8.4807 8.9997 8.73488 9 9V11C8.9997 11.2651 8.89424 11.5193 8.70677 11.7068C8.5193 11.8942 8.26512 11.9997 8 12ZM6 9V11H8V9H6Z"></path></svg>
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                          <svg fill="currentColor" aria-hidden="true" className="w-3.5 h-3.5 mr-1.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                        )}
                        {deploy.environment || 'Production'}
                      </span>
                    </div>

                    {/* Column 5: Commit */}
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {deploy.commitSha ? (
                        <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/commit/${deploy.commitSha}` : "#"} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          </span>
                          <span className="whitespace-nowrap">{deploy.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 6: Branch */}
                    <div className="w-[140px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {service.repositoryBranch ? (
                        <a href={`${service.repositoryUrl}/tree/${service.repositoryBranch}`} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1.5 text-[14px] font-mono truncate hover:underline cursor-pointer">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="flex-none" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
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
