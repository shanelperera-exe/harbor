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
import { Icon } from '../../components/icons';

const ProjectGeistIcon = ({ className }: { className?: string }) => (
  <Icon name="projects" className={className || "w-4 h-4"} />
);

const StaticIcon = ({ className }: { className?: string }) => (
  <Icon name="staticSite" className={className} />
);

const WebIcon = ({ className }: { className?: string }) => (
  <Icon name="globe" className={className} />
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
        // This list paginates on the client (see PAGE_SIZE / paginatedDeployments), so the
        // server is always asked for the first, largest slice. Sending the client-side `page`
        // here with pageSize: 100 made "Next" request server page 2, which comes back empty and
        // blanked the whole list.
        page: 1,
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
            <Icon name="deploy" className="w-[1em] h-[1em]" aria-hidden="true" />
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
                <Icon name="search" />
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
              testId="status-filter"
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
                    data-testid="deployment-row"
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
                    <div data-testid="deployment-row-status" className="w-[120px] flex items-center gap-2 shrink-0 z-20 text-[14px] font-[Geist]">
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
                          <Icon name="environmentBurst" className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                        )}
                        {deploy.environment || 'Production'}
                      </span>
                    </div>

                    {/* Column 5: Commit */}
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current hidden lg:flex">
                      {deploy.commitSha ? (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          <span className="whitespace-nowrap">{deploy.commitSha.substring(0, 7)}</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
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
                  <div data-testid="pagination-label" className="text-gray-500 dark:text-[#8f8f8f]">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{(safePage - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.min(safePage * PAGE_SIZE, filteredHistory.length)}
                    </span>{' '}
                    of <span className="font-medium text-gray-900 dark:text-white">{filteredHistory.length}</span> deployment{filteredHistory.length === 1 ? '' : 's'}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      data-testid="previous-page-button"
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
                      data-testid="next-page-button"
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
