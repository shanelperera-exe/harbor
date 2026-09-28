import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeploymentHistory, type Deployment } from '../../services/deploymentService';
import { getProjects, type Project } from '../../services/projectService';
import { Loader2, CheckCircle, XCircle, Clock, Calendar, CalendarDays, Layers, Circle, ArrowDownUp } from 'lucide-react';
import { BiSolidBolt } from 'react-icons/bi';
import { VscDeveloperTools } from 'react-icons/vsc';
import { IoEyeOutline } from 'react-icons/io5';
import { FaCode } from 'react-icons/fa6';
import { LuRefreshCcw } from "react-icons/lu";
import { format } from 'date-fns';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mapDeployStatus } from '../../services/deploymentService';

const ProjectGeistIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className || "w-4 h-4"}><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
);

const StaticIcon = ({ className }: { className?: string }) => (
  <svg fill="currentColor" className={className} width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path>
    <path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path>
  </svg>
);

const WebIcon = ({ className }: { className?: string }) => (
  <svg fill="currentColor" className={className} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path>
  </svg>
);

const POLL_INTERVAL_MS = 5000;
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

export default function Deployments() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Deployment[]>([]);
  const [page, setPage] = useState(1);
  const [projectId, setProjectId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [dateRange, setDateRange] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getDeploymentHistory({ 
        projectId: projectId || undefined,
        environment: environment || undefined,
        status: status || undefined, 
        page,
        pageSize: 100
      });
      setHistory(result.items);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId, environment, status, page]);

  useEffect(() => { load(false); }, [load]);
  
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (history.some((d) => isActive(d.status))) {
      pollRef.current = setInterval(() => load(true), POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [history, load]);

  const hasActiveDeployments = history.some((d) => isActive(d.status));

  const filterByDate = (d: Deployment) => {
    if (!dateRange) return true;
    const started = new Date(d.startedAt).getTime();
    const now = Date.now();
    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return started >= today.getTime();
    }
    if (dateRange === '7days') return started >= now - 7 * 24 * 60 * 60 * 1000;
    if (dateRange === '30days') return started >= now - 30 * 24 * 60 * 60 * 1000;
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
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  };

  const filteredHistory = history
    .filter((d) => {
      if (!filterByDate(d)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      const hashStr = (d.hash || (d.publicId ? d.publicId.replace('dep-', '') : d.id.toString())).toLowerCase();
      return (
        (d.projectName && d.projectName.toLowerCase().includes(q)) ||
        (d.serviceName && d.serviceName.toLowerCase().includes(q)) ||
        (d.commitSha && d.commitSha.toLowerCase().includes(q)) ||
        (d.version && d.version.toLowerCase().includes(q)) ||
        (d.environment && d.environment.toLowerCase().includes(q)) ||
        hashStr.includes(q) ||
        d.status.toLowerCase().includes(q)
      );
    })
    .sort(sortDeployments);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedDeployments = filteredHistory.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const projectOptions = [
    { value: '', label: 'All projects', icon: ProjectGeistIcon },
    ...projects.map((p) => ({ value: p.id.toString(), label: p.name, icon: ProjectGeistIcon }))
  ];

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
    <div className="w-full h-full p-6 lg:px-12 xl:px-20 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] lg:text-[32px] font-medium text-gray-900 dark:text-white leading-tight tracking-tight">
            <svg fill="currentColor" aria-hidden="true" className="w-[1em] h-[1em]" viewBox="0 0 16 16">
              <path d="M11.5 1L8.5 4L9.2073 4.70115L11 2.9092V14H3V6H2V14C2.00033 14.2651 2.10579 14.5193 2.29326 14.7067C2.48072 14.8942 2.73489 14.9997 3 15H11C11.2651 14.9997 11.5193 14.8942 11.7067 14.7067C11.8942 14.5193 11.9997 14.2651 12 14V2.9077L13.7929 4.70115L14.5 4L11.5 1Z"></path>
              <path d="M8 12H6C5.73488 11.9997 5.4807 11.8942 5.29323 11.7068C5.10576 11.5193 5.0003 11.2651 5 11V9C5.0003 8.73488 5.10576 8.4807 5.29323 8.29323C5.4807 8.10576 5.73488 8.0003 6 8H8C8.26512 8.0003 8.5193 8.10576 8.70677 8.29323C8.89424 8.4807 8.9997 8.73488 9 9V11C8.9997 11.2651 8.89424 11.5193 8.70677 11.7068C8.5193 11.8942 8.26512 11.9997 8 12ZM6 9V11H8V9H6Z"></path>
            </svg>
            Deployments
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#6b6b6b]">
            Review all deployments across your projects.
          </p>
        </div>
      </div>

      <main className="flex flex-col gap-6">
        {/* Search + Filters Toolbar */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search deploys, commits, projects…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full h-10 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm pl-10 pr-4 text-sm font-[Geist] focus:border-[#2563eb] focus:ring-0 focus:outline-none dark:text-white transition-colors"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8f8f8f]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>

            <FilterDropdown
              value={projectId}
              onChange={(v) => { setProjectId(v); setPage(1); }}
              options={projectOptions}
              placeholder="All projects"
              className={dropdownClass}
            />

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

            <FilterDropdown
              value={environment}
              onChange={(v) => { setEnvironment(v); setPage(1); }}
              options={envOptions}
              placeholder="All environments"
              className={dropdownClass}
            />

            <FilterDropdown
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={statusOptions}
              placeholder="All statuses"
              className={dropdownClass}
            />

            <FilterDropdown
              value={sortBy}
              onChange={(v) => { setSortBy(v); setPage(1); }}
              options={sortOptions}
              placeholder="Sort by"
              className={dropdownClass}
            />

            <button
              onClick={() => load(true)}
              title="Refresh"
              className="h-10 w-10 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LuRefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {hasActiveDeployments && (
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800/40 w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live — polling for updates every 5s
            </div>
          )}
        </div>

        {/* Deploys List */}
        <div>
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading deployments…</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-[#6b6b6b]">
              {search || projectId || environment || status ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No matches found</div>
                  <div className="text-xs">Try adjusting your filters.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No deployments yet</div>
                  <div className="text-xs">Deployments will appear here once triggered.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
              {/* Header */}
              <div className="flex flex-row items-center gap-4 xl:gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  Deployment
                  <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                    {filteredHistory.length}
                  </span>
                </div>
                <div className="w-[140px] shrink-0 hidden md:block">Project / Service</div>
                <div className="w-[120px] shrink-0">Status</div>
                <div className="w-[120px] shrink-0 hidden sm:block">Environment</div>
                <div className="w-[100px] shrink-0 hidden lg:block">Commit</div>
                <div className="w-[120px] shrink-0 text-right">Time</div>
              </div>

              {paginatedDeployments.map((deploy, index) => {
                const mappedStatus = mapDeployStatus(deploy.status);
                const projId = projects.find(p => p.name === deploy.projectName)?.id;
                
                return (
                  <div 
                    key={deploy.id} 
                    onClick={() => projId && navigate(`/projects/${projId}/services/${deploy.serviceId}/deployments/${deploy.publicId || deploy.id}`)}
                    className={`group/deployment-row relative flex flex-row items-center gap-4 xl:gap-8 cursor-pointer bg-transparent transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] px-4 h-[56px] ${index !== paginatedDeployments.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''}`}
                  >

                    {/* Column 1: Deployment Name & ID */}
                    <div className="flex-1 min-w-0 flex items-center z-20">
                      <div className="flex flex-col">
                        <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-[Geist] font-medium">
                          {deploy.commitMessage || deploy.version || 'Manual Deploy'}
                        </span>
                        <span className="text-[13px] text-gray-500 dark:text-[#8f8f8f] font-mono mt-0.5 truncate hidden sm:block">
                          {deploy.hash || (deploy.publicId ? deploy.publicId.replace('dep-', '').substring(0, 9) : deploy.id)}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Project / Service */}
                    <div className="w-[140px] shrink-0 z-20 hidden md:flex flex-col justify-center">
                      <span className="text-[14px] font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5" title={deploy.projectName || '—'}>
                        <ProjectGeistIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {deploy.projectName || '—'}
                      </span>
                      <span className="text-[12px] text-gray-500 dark:text-[#8f8f8f] truncate mt-0.5 flex items-center gap-1.5" title={deploy.serviceName || ''}>
                        {deploy.serviceType?.toLowerCase() === 'static' ? <StaticIcon className="w-3 h-3 shrink-0" /> : <WebIcon className="w-3 h-3 shrink-0" />}
                        {deploy.serviceName || ''}
                      </span>
                    </div>

                    {/* Column 3: Status & Duration */}
                    <div className="w-[120px] flex items-center gap-2 shrink-0 z-20 text-[14px] font-[Geist]">
                      <StatusBadge status={mappedStatus.type} label={mappedStatus.label} />
                      <span className="text-gray-900 dark:text-white tabular-nums whitespace-nowrap hidden lg:inline">
                        {duration(deploy)}
                      </span>
                    </div>

                    {/* Column 4: Environment */}
                    <div className="w-[120px] shrink-0 z-20 hidden sm:block">
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
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current hidden lg:flex">
                      {deploy.commitSha ? (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          <span className="whitespace-nowrap">{deploy.commitSha.substring(0, 7)}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 6: Date and Time */}
                    <div className="w-[120px] shrink-0 z-20 text-[14px] text-gray-900 dark:text-white font-[Geist] text-right whitespace-nowrap">
                      {format(new Date(deploy.startedAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Bar */}
              {filteredHistory.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 border-t border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.02] text-xs font-[Geist]">
                  <div className="text-gray-500 dark:text-[#8f8f8f]">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{(safePage - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.min(safePage * PAGE_SIZE, filteredHistory.length)}
                    </span>{' '}
                    of <span className="font-medium text-gray-900 dark:text-white">{filteredHistory.length}</span> deployment{filteredHistory.length === 1 ? '' : 's'}
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
