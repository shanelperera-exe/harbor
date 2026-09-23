import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { XCircle, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, GitCommit, GitBranch, Zap } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { getDeploymentHistory, getDeploymentDetails, redeployDeployment, type Deployment, type DeploymentDetails } from '../../services/deploymentService';

const POLL_INTERVAL_MS = 5000;

// Active states that require polling
const ACTIVE_STATUSES = new Set(['pending', 'running', 'queued']);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'failed') {
    return (
      <div className="bg-[#af1d27] text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <XCircle className="w-3 h-3" /> Failed
      </div>
    );
  }
  if (s === 'succeeded') {
    return (
      <div className="bg-emerald-700 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <CheckCircle className="w-3 h-3" /> Succeeded
      </div>
    );
  }
  if (s === 'running') {
    return (
      <div className="bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <Loader2 className="w-3 h-3 animate-spin" /> Running
      </div>
    );
  }
  if (s === 'pending' || s === 'queued') {
    return (
      <div className="bg-amber-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
        <Clock className="w-3 h-3 animate-pulse" /> {status}
      </div>
    );
  }
  return (
    <div className="bg-gray-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide uppercase shrink-0">
      <Clock className="w-3 h-3" /> {status}
    </div>
  );
}

function duration(deploy: Deployment): string {
  if (!deploy.completedAt || !deploy.startedAt) return '—';
  const ms = new Date(deploy.completedAt).getTime() - new Date(deploy.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DeployDetailPanel({ deploymentId, onClose, onRedeployed }: { deploymentId: number; onClose: () => void; onRedeployed?: () => void }) {
  const [details, setDetails] = useState<DeploymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [redeploying, setRedeploying] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    getDeploymentDetails(deploymentId)
      .then(setDetails)
      .catch((e) => setError(e.message || 'Failed to load details.'))
      .finally(() => setLoading(false));
  }, [deploymentId]);

  // Poll if active
  useEffect(() => {
    if (!details || !isActive(details.status)) return;
    const id = setInterval(() => {
      getDeploymentDetails(deploymentId).then(setDetails).catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [details, deploymentId]);

  return (
    <div className="mt-3 mx-1 border border-[#2a2a2a] dark:border-[#2a2a2a] border-gray-200 rounded-lg bg-[#0a0a0a] dark:bg-[#0a0a0a] text-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <span className="text-xs font-semibold text-[#8f8f8f] uppercase tracking-wider">Deployment Details</span>
        <button onClick={onClose} className="text-[#6b6b6b] hover:text-white transition-colors text-xs flex items-center gap-1">
          <ChevronUp className="w-3.5 h-3.5" /> Close
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-[#6b6b6b] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      ) : details ? (
        <div className="p-4 space-y-4">
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <div className="text-[#6b6b6b] mb-0.5">Status</div>
              <StatusBadge status={details.status} />
            </div>
            <div>
              <div className="text-[#6b6b6b] mb-0.5">Environment</div>
              <div className="text-white font-medium">{details.environment}</div>
            </div>
            <div>
              <div className="text-[#6b6b6b] mb-0.5">Version / Branch</div>
              <div className="text-white font-mono flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-[#6b6b6b]" />
                {details.version}
              </div>
            </div>
            {details.commitSha && (
              <div>
                <div className="text-[#6b6b6b] mb-0.5">Commit SHA</div>
                <div className="text-white font-mono flex items-center gap-1">
                  <GitCommit className="w-3 h-3 text-[#6b6b6b]" />
                  {details.commitSha.substring(0, 12)}
                </div>
              </div>
            )}
            <div>
              <div className="text-[#6b6b6b] mb-0.5">Started</div>
              <div className="text-white">{format(new Date(details.startedAt), 'MMM d, HH:mm:ss')}</div>
            </div>
            {details.completedAt && (
              <div>
                <div className="text-[#6b6b6b] mb-0.5">Completed</div>
                <div className="text-white">{format(new Date(details.completedAt), 'MMM d, HH:mm:ss')}</div>
              </div>
            )}
            {details.workflowFile && (
              <div>
                <div className="text-[#6b6b6b] mb-0.5">Workflow</div>
                <div className="text-white font-mono flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#6b6b6b]" />
                  {details.workflowFile}
                </div>
              </div>
            )}
            {details.workflowRunUrl && (
              <div className="col-span-2 sm:col-span-1">
                <div className="text-[#6b6b6b] mb-0.5">GitHub Actions Run</div>
                <a
                  href={details.workflowRunUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  View on GitHub ↗
                </a>
              </div>
            )}
          </div>

          {/* Redeploy button for succeeded deployments */}
          {details?.status.toLowerCase() === 'succeeded' && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setRedeploying(true);
                  try {
                    await redeployDeployment(deploymentId);
                    onRedeployed?.();
                  } catch (err) {
                    setError((err as Error).message || 'Failed to redeploy.');
                  } finally {
                    setRedeploying(false);
                  }
                }}
                disabled={redeploying}
                className="h-8 px-3 flex items-center gap-2 text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#1a2d4a] disabled:text-[#4a6fa5] text-white rounded-sm transition-colors"
              >
                {redeploying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Re-deploy
              </button>
            </div>
          )}

          {/* Trigger error */}
          {(details as any).triggerError && (
            <div className="p-3 bg-amber-950/40 border border-amber-700/40 rounded-md text-xs text-amber-300 flex gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Workflow trigger error</div>
                <div className="font-mono">{(details as any).triggerError}</div>
              </div>
            </div>
          )}

          {/* Failure reason */}
          {details.failureReason && (
            <div className="p-3 bg-red-950/40 border border-red-700/40 rounded-md text-xs text-red-300 flex gap-2">
              <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Failure reason</div>
                <div>{details.failureReason}</div>
              </div>
            </div>
          )}

          {/* Logs */}
          <div>
            <div className="text-[#6b6b6b] text-xs font-semibold uppercase tracking-wider mb-2">
              Execution Logs {details.logs.length > 0 && <span className="ml-1 text-[#444]">({details.logs.length})</span>}
            </div>
            {details.logs.length === 0 ? (
              <div className="text-center py-5 text-[#555] text-xs">
                {isActive(details.status) ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Waiting for logs…
                  </div>
                ) : (
                  'No execution logs were recorded for this deployment.'
                )}
              </div>
            ) : (
              <div className="bg-[#060606] border border-[#1a1a1a] rounded-md p-3 max-h-52 overflow-y-auto font-mono text-xs space-y-1">
                {details.logs.map((log, i) => (
                  <div key={i} className={`flex gap-2 ${log.level.toLowerCase() === 'error' ? 'text-red-400' : log.level.toLowerCase() === 'warn' ? 'text-amber-400' : 'text-[#c9c9c9]'}`}>
                    <span className="text-[#444] shrink-0">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                    <span className="text-[#555] shrink-0">[{log.level}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ServiceDeploys() {
  const { serviceId } = useParams();
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deployRefreshKey = 0 } = context ?? {};

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [redeployingId, setRedeployingId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleRedeploy = async (id: number) => {
    setRedeployingId(id);
    try {
      await redeployDeployment(id);
      // Refresh the deployments list
      await fetchDeployments(true);
    } catch (err) {
      console.error('Failed to redeploy:', err);
    } finally {
      setRedeployingId(null);
    }
  };

  const fetchDeployments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await getDeploymentHistory({ serviceId, page: 1 });
      setDeployments(result.items);
      setTotalCount(result.totalCount);
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

  const filteredDeployments = deployments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.commitSha && d.commitSha.toLowerCase().includes(q)) ||
      (d.version && d.version.toLowerCase().includes(q)) ||
      (d.environment && d.environment.toLowerCase().includes(q)) ||
      d.status.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const hasActiveDeployments = deployments.some((d) => isActive(d.status));

  return (
    <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search deploys, commits, branches, environments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm pl-10 pr-4 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none dark:text-white transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8f8f8f]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <button
          onClick={() => fetchDeployments(true)}
          title="Refresh"
          className="h-10 w-10 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Live polling indicator */}
      {hasActiveDeployments && (
        <div className="flex items-center gap-2 text-xs text-blue-400 -mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live — polling for updates every {POLL_INTERVAL_MS / 1000}s
        </div>
      )}

      {/* Deploys List */}
      <div>
        <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 dark:border-[#525252] text-xs font-mono font-medium text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider">
          <div className="col-span-7 md:col-span-6 flex items-center gap-2">
            Deploy
            <span className="inline-flex items-center justify-center px-1.5 h-4 bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-gray-300 rounded-sm font-sans text-[10px]">
              {totalCount}
            </span>
          </div>
          <div className="col-span-2 hidden md:block">Environment</div>
          <div className="col-span-2 hidden md:block">Duration</div>
          <div className="col-span-5 md:col-span-2 text-right">Details</div>
        </div>

        <div className="flex flex-col">
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
            filteredDeployments.map((deploy) => {
              const isExpanded = expandedId === deploy.id;
              const active = isActive(deploy.status);

              return (
                <div key={deploy.id} className={`border-b border-gray-200 dark:border-[#1f1f1f] ${active ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}`}>
                  <div
                    className="grid grid-cols-12 gap-4 py-3.5 items-start hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors cursor-pointer group rounded-sm px-2 -mx-2"
                    onClick={() => toggleExpand(deploy.id)}
                  >
                    {/* Deploy info */}
                    <div className="col-span-7 md:col-span-6 flex gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        <StatusBadge status={deploy.status} />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-[#f0f0f0] group-hover:text-[#3b82f6] truncate transition-colors">
                          {deploy.version || 'Manual Deploy'}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#6b6b6b] flex-wrap">
                          {deploy.commitSha && (
                            <>
                              <span className="font-mono bg-gray-100 dark:bg-[#1f1f1f] px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                <GitCommit className="w-2.5 h-2.5" />
                                {deploy.commitSha.substring(0, 7)}
                              </span>
                              <span className="text-gray-300 dark:text-[#333]">•</span>
                            </>
                          )}
                          <span className="truncate">
                            {formatDistanceToNow(new Date(deploy.startedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Environment */}
                    <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-0.5 hidden md:flex items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-gray-100 dark:bg-[#1f1f1f] text-gray-700 dark:text-[#aaa] border border-gray-200 dark:border-[#2a2a2a]">
                        {deploy.environment}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-0.5 font-mono hidden md:block">
                      {duration(deploy)}
                    </div>

                    {/* Expand toggle + Redeploy button */}
                    <div className="col-span-5 md:col-span-2 flex justify-end items-center gap-1 pt-0.5">
                      {deploy.status.toLowerCase() === 'succeeded' && (
                          <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRedeploy(deploy.id);
                          }}
                          disabled={redeployingId === deploy.id}
                          className="text-xs flex items-center gap-1 px-2 py-0.5 text-[#2563eb] hover:bg-[#2563eb]/10 border border-[#2563eb]/30 rounded-sm transition-colors disabled:opacity-50"
                          title="Re-deploy this version"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Re-deploy
                        </button>
                      )}
                      <button
                        className="text-xs flex items-center gap-1 text-gray-400 dark:text-[#6b6b6b] hover:text-[#3b82f6] transition-colors"
                        onClick={(e) => { e.stopPropagation(); toggleExpand(deploy.id); }}
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> Close</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> Details</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <DeployDetailPanel
                      deploymentId={deploy.id}
                      onClose={() => setExpandedId(null)}
                      onRedeployed={() => { setExpandedId(null); fetchDeployments(true); }}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
