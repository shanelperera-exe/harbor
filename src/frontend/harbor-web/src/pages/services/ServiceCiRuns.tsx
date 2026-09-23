import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { XCircle, CheckCircle, Clock, Loader2, RefreshCw, GitCommit, GitBranch } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { getCiRunHistory, type CiRun, type CiRunHistory } from '../../services/deploymentService';

const POLL_INTERVAL_MS = 5000;

const ACTIVE_STATUSES = new Set(['in_progress', 'queued', 'waiting']);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'succeeded') {
    return (
      <div className="bg-emerald-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <CheckCircle className="w-3 h-3" /> Success
      </div>
    );
  }
  if (s === 'failure' || s === 'failed') {
    return (
      <div className="bg-[#af1d27] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <XCircle className="w-3 h-3" /> Failed
      </div>
    );
  }
  if (s === 'in_progress') {
    return (
      <div className="bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <Loader2 className="w-3 h-3 animate-spin" /> In Progress
      </div>
    );
  }
  if (s === 'queued' || s === 'waiting') {
    return (
      <div className="bg-amber-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <Clock className="w-3 h-3 animate-pulse" /> Queued
      </div>
    );
  }
  if (s === 'cancelled') {
    return (
      <div className="bg-gray-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <Clock className="w-3 h-3" /> Cancelled
      </div>
    );
  }
  return (
    <div className="bg-gray-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
      <Clock className="w-3 h-3" /> {status}
    </div>
  );
}

function runDuration(ciRun: CiRun): string {
  if (!ciRun.completedAt || !ciRun.startedAt) return '—';
  const ms = new Date(ciRun.completedAt).getTime() - new Date(ciRun.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function ServiceCiRuns() {
  const { serviceId } = useParams();
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { service } = context ?? {};

  const [ciRuns, setCiRuns] = useState<CiRun[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const servicePublicId = service?.publicId || service?.id?.toString();

  const fetchCiRuns = useCallback(async (silent = false, targetPage = page) => {
    if (!servicePublicId) return;
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const result = await getCiRunHistory(servicePublicId, targetPage, pageSize);
      setCiRuns(result.items);
      setTotalCount(result.totalCount);
      setError(null);
    } catch (err) {
      setError((err as Error).message || 'Failed to load CI runs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [servicePublicId, page]);

  useEffect(() => {
    fetchCiRuns(false, 1);
    setPage(1);
  }, [fetchCiRuns]);

  // Auto-poll when any CI run is in an active state
  useEffect(() => {
    const hasActive = ciRuns.some((r) => isActive(r.status));
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (hasActive) {
      pollRef.current = setInterval(() => fetchCiRuns(true, page), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [ciRuns, fetchCiRuns, page]);

  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          CI History
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-[#8f8f8f]">
            {totalCount} run{totalCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => fetchCiRuns(true, page)}
            disabled={refreshing}
            title="Refresh"
            className="h-8 w-8 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Live polling indicator */}
      {ciRuns.some((r) => isActive(r.status)) && (
        <div className="flex items-center gap-2 text-xs text-blue-400 -mt-3 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live — polling for updates every {POLL_INTERVAL_MS / 1000}s
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-md text-sm text-red-400">
          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* CI Runs List */}
      <div className="flex-1">
        <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 dark:border-[#525252] text-xs font-mono font-medium text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider">
          <div className="col-span-5 md:col-span-4 flex items-center gap-2">
            Workflow
            <span className="inline-flex items-center justify-center px-1.5 h-4 bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-gray-300 rounded-sm font-sans text-[10px]">
              {totalCount}
            </span>
          </div>
          <div className="col-span-2 hidden md:block">Branch</div>
          <div className="col-span-2 hidden md:block">Duration</div>
          <div className="col-span-2 hidden md:block text-right">When</div>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading CI runs…</span>
            </div>
          ) : ciRuns.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-[#6b6b6b]">
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No CI runs yet</div>
                <div className="text-xs">CI runs are tracked automatically when GitHub Actions workflows run on this repository.</div>
              </div>
            </div>
          ) : (
            ciRuns.map((ciRun) => (
              <div key={ciRun.id} className="border-b border-gray-200 dark:border-[#1f1f1f]">
                <div className="grid grid-cols-12 gap-4 py-3.5 items-center hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors rounded-sm px-2 -mx-2">
                  {/* Workflow info */}
                  <div className="col-span-5 md:col-span-4 flex gap-3 items-center min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <StatusBadge status={ciRun.status} />
                    </div>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f0f0f0] truncate">
                        {ciRun.workflowName}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#6b6b6b] flex-wrap">
                        <span className="font-mono bg-gray-100 dark:bg-[#1f1f1f] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                          <GitCommit className="w-2.5 h-2.5" />
                          {ciRun.workflowFile}
                        </span>
                        <span className="text-gray-300 dark:text-[#333]">·</span>
                        <span className="truncate">
                          {ciRun.commitSha?.substring(0, 7) || '—'}
                        </span>
                        {ciRun.conclusion && (
                          <>
                            <span className="text-gray-300 dark:text-[#333]">·</span>
                            <span className="truncate">
                              {ciRun.conclusion}
                            </span>
                          </>
                        )}
                        {ciRun.githubRunUrl && (
                          <>
                            <span className="text-gray-300 dark:text-[#333]">·</span>
                            <a
                              href={ciRun.githubRunUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#3b82f6] hover:underline truncate flex items-center gap-1"
                            >
                              <FaGithub className="w-3 h-3" />
                              View run
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Branch */}
                  <div className="col-span-2 text-sm text-gray-500 dark:text-[#6b6b6b] pt-0.5 hidden md:flex items-center">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {ciRun.branch}
                    </span>
                  </div>

                  {/* Duration */}
                  <div className="col-span-2 text-sm text-gray-500 dark:text-[#6b6b6b] pt-0.5 font-mono hidden md:block">
                    {runDuration(ciRun)}
                  </div>

                  {/* When */}
                  <div className="col-span-2 text-sm text-gray-500 dark:text-[#6b6b6b] pt-0.5 text-right hidden md:block">
                    <span className="truncate">
                      {formatDistanceToNow(new Date(ciRun.startedAt), { addSuffix: true })}
                    </span>
                    <div className="text-xs text-gray-400 dark:text-[#4a4a4a] mt-0.5">
                      {ciRun.startedAt ? new Date(ciRun.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!loading && ciRuns.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-[#525252]">
          <div className="text-xs text-gray-500 dark:text-[#6b6b6b]">
            Page {page} of {totalPages} · {totalCount} total
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={!canPrev || refreshing}
              className="h-7 px-3 text-xs font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!canNext || refreshing}
              className="h-7 px-3 text-xs font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
