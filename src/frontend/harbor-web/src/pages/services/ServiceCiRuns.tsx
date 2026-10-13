import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Clock, Calendar, CalendarDays, Circle, ArrowDownUp, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { LuRefreshCcw } from "react-icons/lu";
import { FaGithub } from 'react-icons/fa';
import { Icon } from '../../components/icons';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { getCiRunHistory, type CiRun } from '../../services/deploymentService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';

const POLL_INTERVAL_MS = 5000;

// Active states that require polling
const ACTIVE_STATUSES = new Set(['in_progress', 'queued', 'waiting']);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

function runDuration(ciRun: CiRun): string {
  if (!ciRun.completedAt || !ciRun.startedAt) return '—';
  const ms = new Date(ciRun.completedAt).getTime() - new Date(ciRun.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function mapCiStatus(ciRun: CiRun): { type: any, label: string } {
  const status = ciRun.status?.toLowerCase();
  const conclusion = ciRun.conclusion?.toLowerCase();

  if (status === 'completed') {
    if (conclusion === 'success') return { type: 'success', label: 'Success' };
    if (conclusion === 'failure') return { type: 'error', label: 'Failed' };
    if (conclusion === 'cancelled') return { type: 'warning', label: 'Cancelled' };
    return { type: 'warning', label: conclusion ? conclusion.charAt(0).toUpperCase() + conclusion.slice(1) : 'Completed' };
  }
  
  if (status === 'in_progress') return { type: 'running', label: 'Running' };
  if (status === 'queued' || status === 'waiting') return { type: 'pending', label: 'Queued' };
  
  return { type: 'pending', label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown' };
}

export default function ServiceCiRuns() {
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { service } = context ?? {};

  const [ciRuns, setCiRuns] = useState<CiRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const servicePublicId = service?.publicId || service?.id?.toString();

  const fetchCiRuns = useCallback(async (silent = false) => {
    if (!servicePublicId) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await getCiRunHistory(servicePublicId, 1, 100);
      setCiRuns(result.items);
    } catch (err) {
      console.error('Failed to fetch CI runs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [servicePublicId]);

  // Initial fetch
  useEffect(() => {
    fetchCiRuns(false);
  }, [fetchCiRuns]);

  // Auto-poll when any run is in an active state
  useEffect(() => {
    const hasActive = ciRuns.some((r) => isActive(r.status));
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (hasActive) {
      pollRef.current = setInterval(() => fetchCiRuns(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ciRuns, fetchCiRuns]);

  const filterByDate = (d: CiRun) => {
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

  const sortRuns = (a: CiRun, b: CiRun) => {
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

  const filteredRuns = ciRuns
    .filter((d) => {
      if (selectedStatus) {
        const mappedStatus = mapCiStatus(d);
        if (mappedStatus.label.toLowerCase() !== selectedStatus.toLowerCase()) {
          return false;
        }
      }
      if (!filterByDate(d)) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (d.commitSha && d.commitSha.toLowerCase().includes(q)) ||
        (d.workflowName && d.workflowName.toLowerCase().includes(q)) ||
        (d.workflowFile && d.workflowFile.toLowerCase().includes(q)) ||
        (d.branch && d.branch.toLowerCase().includes(q)) ||
        d.status.toLowerCase().includes(q) ||
        (d.conclusion && d.conclusion.toLowerCase().includes(q))
      );
    })
    .sort(sortRuns);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedRuns = filteredRuns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const dateOptions = [
    { value: '', label: 'All time', icon: Calendar },
    { value: 'today', label: 'Today', icon: Clock },
    { value: '7days', label: 'Last 7 days', icon: CalendarDays },
    { value: '30days', label: 'Last 30 days', icon: CalendarDays },
    { value: 'custom', label: 'Custom range...', icon: Calendar },
  ];

  const statusOptions = [
    { value: '', label: 'All statuses', icon: Circle },
    { value: 'Success', label: 'Success', icon: CheckCircle },
    { value: 'Failed', label: 'Failed', icon: XCircle },
    { value: 'Running', label: 'Running', icon: Loader2 },
    { value: 'Queued', label: 'Queued', icon: Clock },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest first', icon: ArrowDownUp },
    { value: 'oldest', label: 'Oldest first', icon: ArrowDownUp },
    { value: 'duration', label: 'Duration', icon: Clock },
  ];

  const dropdownClass = "flex items-center justify-between gap-2 h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors min-w-[160px]";

  return (
    <div className="flex flex-col w-full">
      <ServiceHeader />

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
      {/* Page Title */}
      <SectionTitle
        icon={<Activity />}
        title="CI History"
        description="Track GitHub Actions workflow runs for this service."
      />

      {/* Search + Filters Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search workflows, commits, branches…"
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
            onClick={() => fetchCiRuns(true)}
            title="Refresh"
            className="h-10 w-10 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <LuRefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* CI Runs List */}
      <div>
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading CI runs…</span>
            </div>
          ) : filteredRuns.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-[#6b6b6b]">
              {search ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No matches for "{search}"</div>
                  <div className="text-xs">Try a different search term.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No CI runs yet</div>
                  <div className="text-xs">CI runs are tracked automatically when GitHub Actions workflows run on this repository.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
              {/* Header */}
              <div className="flex flex-row items-center gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  Workflow
                  <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                    {filteredRuns.length}
                  </span>
                </div>
                <div className="w-[140px] shrink-0">File</div>
                <div className="w-[140px] shrink-0">Status</div>
                <div className="w-[100px] shrink-0">Commit</div>
                <div className="w-[140px] shrink-0">Branch</div>
                <div className="w-[120px] shrink-0 text-right">Time</div>
              </div>

              {paginatedRuns.map((ciRun, index) => {
                const mappedStatus = mapCiStatus(ciRun);
                
                return (
                  <div 
                    key={ciRun.id} 
                    className={`group/ci-row relative flex flex-row items-center gap-8 bg-transparent transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] px-4 h-[56px] ${index !== paginatedRuns.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''}`}
                  >

                    {/* Column 1: Workflow Name */}
                    <div className="flex-1 min-w-0 flex items-center z-20">
                      {ciRun.githubRunUrl ? (
                        <a href={ciRun.githubRunUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[14.5px] text-[#2563eb] hover:underline font-[Geist] font-medium truncate">
                          <FaGithub className="w-4 h-4 shrink-0 text-[#2563eb]" />
                          <span className="truncate text-[#2563eb]">{ciRun.workflowName}</span>
                        </a>
                      ) : (
                        <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-[Geist] font-medium">
                          {ciRun.workflowName}
                        </span>
                      )}
                    </div>

                    {/* Column 2: File */}
                    <div className="w-[140px] shrink-0 z-20">
                      <span className="text-[13px] text-gray-900 dark:text-white font-mono truncate px-1.5 py-0.5 bg-gray-100 dark:bg-[#202020] border border-gray-200 dark:border-[#333] rounded-sm">
                        {ciRun.workflowFile}
                      </span>
                    </div>

                    {/* Column 3: Status & Duration */}
                    <div className="w-[140px] flex items-center gap-2 shrink-0 z-20 text-[14px] font-[Geist]">
                      <StatusBadge status={mappedStatus.type} label={mappedStatus.label} />
                      <span className="text-gray-900 dark:text-white tabular-nums whitespace-nowrap text-xs">
                        {runDuration(ciRun)}
                      </span>
                    </div>

                    {/* Column 4: Commit */}
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {ciRun.commitSha ? (
                        <a href={service.repositoryUrl ? `${service.repositoryUrl}/commit/${ciRun.commitSha}` : "#"} target="_blank" rel="noopener noreferrer" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          </span>
                          <span className="whitespace-nowrap">{ciRun.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 5: Branch */}
                    <div className="w-[140px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {ciRun.branch ? (
                        <a href={service.repositoryUrl ? `${service.repositoryUrl}/tree/${ciRun.branch}` : "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[14px] font-mono truncate hover:underline cursor-pointer">
                          <Icon name="gitBranch" className="flex-none" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          {ciRun.branch}
                        </a>
                      ) : (
                        <span className="text-[14px] font-mono text-gray-900 dark:text-white">-</span>
                      )}
                    </div>

                    {/* Column 6: Date and Time */}
                    <div className="w-[120px] shrink-0 z-20 text-[14px] text-gray-900 dark:text-white font-[Geist] text-right whitespace-nowrap">
                      {format(new Date(ciRun.startedAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                );
              })}

              {/* Pagination Bar */}
              {filteredRuns.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 border-t border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.02] text-xs font-[Geist]">
                  <div className="text-gray-500 dark:text-[#8f8f8f]">
                    Showing <span className="font-medium text-gray-900 dark:text-white">{(safePage - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.min(safePage * PAGE_SIZE, filteredRuns.length)}
                    </span>{' '}
                    of <span className="font-medium text-gray-900 dark:text-white">{filteredRuns.length}</span> run{filteredRuns.length === 1 ? '' : 's'}
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
