import { useEffect, useState, useCallback, useRef } from 'react';
import { getDeploymentHistory, getDeploymentDetails, type Deployment, type DeploymentDetails } from '../../services/deploymentService';
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle, GitCommit, GitBranch, Zap, RefreshCw, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const POLL_MS = 6000;
const ACTIVE = new Set(['pending', 'running', 'queued']);
const isActive = (s: string) => ACTIVE.has(s.toLowerCase());

const STATUS_FILTERS = ['', 'Succeeded', 'Failed', 'Running', 'Pending'];

function statusPill(status: string) {
  const s = status.toLowerCase();
  if (s === 'failed') return 'text-red-400 bg-red-950/50 border border-red-800/40';
  if (s === 'succeeded') return 'text-emerald-400 bg-emerald-950/50 border border-emerald-800/40';
  if (s === 'running') return 'text-blue-400 bg-blue-950/50 border border-blue-800/40 animate-pulse';
  return 'text-amber-400 bg-amber-950/40 border border-amber-700/40';
}

function StatusIcon({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'failed') return <XCircle className="w-3.5 h-3.5" />;
  if (s === 'succeeded') return <CheckCircle className="w-3.5 h-3.5" />;
  if (s === 'running') return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  return <Clock className="w-3.5 h-3.5" />;
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy HH:mm');
}

function duration(d: Deployment) {
  if (!d.completedAt) return '—';
  const ms = new Date(d.completedAt).getTime() - new Date(d.startedAt).getTime();
  const s = Math.max(1, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function Deployments() {
  const [history, setHistory] = useState<Deployment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<DeploymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else { setIsLoading(true); setError(null); }
    try {
      const result = await getDeploymentHistory({ status: status || undefined, page });
      setHistory(result.items);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load deployment history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [status, page]);

  useEffect(() => { load(false); }, [load]);

  // Auto-poll while active deployments exist
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (history.some((d) => isActive(d.status))) {
      pollRef.current = setInterval(() => load(true), POLL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [history, load]);

  // When selected deployment is active, keep its detail fresh
  useEffect(() => {
    if (!selected || !isActive(selected.status)) return;
    const id = setInterval(async () => {
      try {
        const fresh = await getDeploymentDetails(selected.id);
        setSelected(fresh);
      } catch { /* silent */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [selected]);

  async function selectDeployment(deployment: Deployment) {
    try {
      setError(null);
      setSelected(await getDeploymentDetails(deployment.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load deployment details.');
    }
  }

  const hasActive = history.some((d) => isActive(d.status));

  return (
    <div className="w-full h-full p-6 lg:px-12 xl:px-20 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#0d0d0d]">
      {/* Page header */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deployments</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#6b6b6b]">
            Review previous releases and their execution output.
            {totalCount > 0 && <span className="ml-2 font-medium text-gray-700 dark:text-[#8f8f8f]">{totalCount} total</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasActive && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Live updates on
            </div>
          )}
          <button
            onClick={() => load(true)}
            title="Refresh"
            className="h-8 w-8 flex items-center justify-center border border-gray-200 dark:border-[#2a2a2a] hover:border-gray-400 dark:hover:border-[#3a3a3a] rounded-md text-gray-500 dark:text-[#6b6b6b] hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            aria-label="Filter deployment status"
            className="h-8 pl-3 pr-8 text-sm border border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#141414] text-gray-700 dark:text-[#c9c9c9] rounded-md focus:outline-none focus:border-[#3b82f6] transition-colors"
          >
            {STATUS_FILTERS.map((v) => (
              <option key={v} value={v} className="bg-white dark:bg-[#141414]">
                {v || 'All statuses'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 rounded-lg text-red-600 dark:text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading deployment history…</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-[#555]">
          <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-[#141414] flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-600 dark:text-[#8f8f8f] mb-1">No deployments found</div>
            <div className="text-sm">{status ? `No "${status}" deployments.` : 'Trigger a deployment from a service page.'}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_400px] gap-6">
          {/* History table */}
          <section className="border border-gray-200 dark:border-[#1f1f1f] rounded-lg overflow-hidden" aria-label="Deployment history">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-[#111] border-b border-gray-200 dark:border-[#1f1f1f]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider">Environment</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider">Version / Commit</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider hidden md:table-cell">Duration</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider">Started</th>
                    <th className="px-4 py-3 w-12"><span className="sr-only">Details</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#141414]">
                  {history.map((dep) => (
                    <tr
                      key={dep.id}
                      className={`hover:bg-gray-50 dark:hover:bg-[#111] transition-colors cursor-pointer ${selected?.id === dep.id ? 'bg-blue-50/60 dark:bg-blue-950/10' : ''}`}
                      onClick={() => selectDeployment(dep)}
                    >
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium ${statusPill(dep.status)}`}>
                          <StatusIcon status={dep.status} />
                          {dep.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-100 dark:bg-[#1a1a1a] text-gray-700 dark:text-[#aaa] border border-gray-200 dark:border-[#2a2a2a]">
                          {dep.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-900 dark:text-[#e3e3e3] font-mono text-xs">
                          <GitBranch className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{dep.version}</span>
                        </div>
                        {dep.commitSha && (
                          <div className="flex items-center gap-1 mt-0.5 text-gray-400 dark:text-[#555] font-mono text-[11px]">
                            <GitCommit className="w-2.5 h-2.5" />
                            {dep.commitSha.slice(0, 10)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-[#6b6b6b] font-mono text-xs hidden md:table-cell">
                        {duration(dep)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-[#6b6b6b] text-xs whitespace-nowrap">
                        <div>{formatDate(dep.startedAt)}</div>
                        <div className="text-[11px] text-gray-400 dark:text-[#444]">{formatDistanceToNow(new Date(dep.startedAt), { addSuffix: true })}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ChevronRight className={`w-4 h-4 transition-transform text-gray-400 dark:text-[#444] ${selected?.id === dep.id ? 'rotate-90 text-[#3b82f6]' : ''}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between text-sm border-t border-gray-200 dark:border-[#1f1f1f] bg-gray-50 dark:bg-[#0a0a0a]">
              <span className="text-gray-500 dark:text-[#6b6b6b]">
                {totalCount} deployment{totalCount === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 rounded border border-gray-200 dark:border-[#2a2a2a] text-xs font-medium hover:bg-gray-100 dark:hover:bg-[#141414] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-gray-500 dark:text-[#6b6b6b] text-xs">Page {page}</span>
                <button
                  disabled={history.length < 20}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 rounded border border-gray-200 dark:border-[#2a2a2a] text-xs font-medium hover:bg-gray-100 dark:hover:bg-[#141414] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </section>

          {/* Detail panel */}
          <DeploymentDetailPanel deployment={selected} />
        </div>
      )}
    </div>
  );
}

function DeploymentDetailPanel({ deployment }: { deployment: DeploymentDetails | null }) {
  if (!deployment) {
    return (
      <aside className="border border-dashed border-gray-200 dark:border-[#1f1f1f] rounded-lg p-8 flex flex-col items-center justify-center text-center text-gray-400 dark:text-[#444] gap-3">
        <ChevronRight className="w-8 h-8 rotate-90" />
        <div>
          <div className="font-medium text-gray-500 dark:text-[#555] mb-1">No deployment selected</div>
          <div className="text-sm">Click a row to view its logs and details.</div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="border border-gray-200 dark:border-[#1f1f1f] rounded-lg overflow-hidden" aria-label="Deployment details">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-[#1f1f1f]">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Deployment #{deployment.id}
          </h2>
          {deployment.publicId && (
            <span className="text-xs text-gray-400 dark:text-[#555] font-mono">
              {deployment.publicId}
            </span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-xs font-medium ${statusPill(deployment.status)}`}>
          <StatusIcon status={deployment.status} />
          {deployment.status}
        </span>
      </div>

      <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(100vh-220px)]">
        {/* Meta */}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Environment</dt>
            <dd className="font-medium text-gray-900 dark:text-[#e3e3e3]">{deployment.environment}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Version</dt>
            <dd className="font-mono text-gray-900 dark:text-[#e3e3e3] flex items-center gap-1 text-xs">
              <GitBranch className="w-3 h-3 text-gray-400" />
              {deployment.version}
            </dd>
          </div>
          {deployment.commitSha && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Commit</dt>
              <dd className="font-mono text-xs text-gray-700 dark:text-[#aaa] flex items-center gap-1">
                <GitCommit className="w-3 h-3 text-gray-400" />
                {deployment.commitSha.slice(0, 12)}
              </dd>
            </div>
          )}
          {deployment.workflowFile && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Workflow</dt>
              <dd className="font-mono text-xs text-gray-700 dark:text-[#aaa] flex items-center gap-1">
                <Zap className="w-3 h-3 text-gray-400" />
                {deployment.workflowFile}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Started</dt>
            <dd className="text-xs text-gray-700 dark:text-[#aaa]">{formatDate(deployment.startedAt)}</dd>
          </div>
          {deployment.completedAt && (
            <div>
              <dt className="text-xs text-gray-500 dark:text-[#6b6b6b] mb-0.5">Completed</dt>
              <dd className="text-xs text-gray-700 dark:text-[#aaa]">{formatDate(deployment.completedAt)}</dd>
            </div>
          )}
        </dl>

        {/* Trigger error */}
        {deployment.triggerError && (
          <div className="p-3 bg-amber-950/40 border border-amber-700/40 rounded-md text-xs text-amber-300 flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">Workflow trigger error</div>
              <div className="font-mono leading-relaxed">{deployment.triggerError}</div>
            </div>
          </div>
        )}

        {/* Failure */}
        {deployment.failureReason && (
          <div className="p-3 bg-red-950/40 border border-red-700/40 rounded-md text-xs text-red-300 flex gap-2">
            <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">Failure reason</div>
              <div>{deployment.failureReason}</div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-[#6b6b6b] uppercase tracking-wider mb-2 flex items-center gap-2">
            Execution Logs
            {deployment.logs.length > 0 && (
              <span className="text-[#444] font-mono normal-case tracking-normal">({deployment.logs.length})</span>
            )}
          </h3>
          {deployment.logs.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-[#444] text-xs">
              {isActive(deployment.status) ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Waiting for execution logs…
                </div>
              ) : 'No logs were recorded for this deployment.'}
            </div>
          ) : (
            <div className="bg-[#060606] border border-[#1a1a1a] rounded-md p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
              {deployment.logs.map((log, i) => (
                <div key={i} className={`flex gap-2 ${log.level.toLowerCase() === 'error' ? 'text-red-400' : log.level.toLowerCase() === 'warn' ? 'text-amber-400' : 'text-[#c9c9c9]'}`}>
                  <span className="text-[#333] shrink-0">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                  <span className="text-[#444] shrink-0">[{log.level}]</span>
                  <span className="break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
