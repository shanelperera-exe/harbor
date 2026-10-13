import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getDashboardSummary,
  mapDashboardDeployStatus,
  type DashboardProject,
  type DashboardDeployment,
  type DashboardMetrics
} from '../../services/dashboardService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  Loader2,
  FolderGit2,
  Rocket,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  RefreshCw,
  GitCommit,
  Layers,
  Activity,
  Users,
  Globe,
  ScrollText
} from 'lucide-react';
import { format } from '../../utils/dateUtils';

const getEnvironmentColor = (env: string) => {
  const e = (env || '').toLowerCase();
  if (e === 'production') return 'bg-blue-600 text-white';
  if (e === 'preview' || e === 'staging') return 'bg-purple-600 text-white';
  if (e === 'development') return 'bg-gray-800 text-white dark:bg-white dark:text-gray-900';
  return 'bg-gray-500 text-white';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [recentDeployments, setRecentDeployments] = useState<DashboardDeployment[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    totalDeployments: 0,
    successfulDeployments: 0,
    runningDeployments: 0,
    failedDeployments: 0,
  });

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getDashboardSummary();
      setProjects(data.projects || []);
      setRecentDeployments(data.recentDeployments || []);
      setMetrics(data.metrics);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err?.message || 'Unable to retrieve platform information.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  if (loading) {
    return (
      <div id="dashboard-loading" className="flex flex-col items-center justify-center w-full h-[60vh] gap-3 bg-white dark:bg-[#202124]">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-xs text-gray-500 dark:text-[#9aa0a6] font-mono">Synchronizing platform control plane...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="dashboard-error" className="flex flex-col items-center justify-center w-full h-[60vh] gap-4 px-4 text-center bg-white dark:bg-[#202124]">
        <div className="w-10 h-10 rounded-sm bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60">
          <XCircle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-medium text-gray-900 dark:text-white mb-1">Failed to synchronize control plane</h2>
          <p className="text-xs text-gray-500 dark:text-[#9aa0a6] max-w-md font-mono">{error}</p>
        </div>
        <button
          id="btn-retry-dashboard"
          onClick={() => loadData(false)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-medium rounded-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
        </button>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="w-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 space-y-6 transition-colors duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-300 dark:border-[#3c4043]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Platform Control Plane
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              Operator Console
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Real-time supervisor across all customer tenants, build pipelines, microservices, and edge routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-refresh-dashboard"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] hover:bg-gray-100 dark:hover:bg-[#2c2d30] rounded-sm transition-colors disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
          </button>

          <Link
            id="btn-view-health"
            to="/health"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-medium rounded-sm transition-colors"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Cluster Health</span>
          </Link>
        </div>
      </div>

      {/* Operator Quick Launch Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link 
          to="/health" 
          className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:border-blue-500 transition-colors bg-white dark:bg-[#202124] group"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Microservices</span>
            <Activity className="w-4 h-4 text-emerald-500 group-hover:scale-105 transition-transform" />
          </div>
          <div className="text-sm font-medium mt-1 text-gray-900 dark:text-white">System Health</div>
          <div className="text-[11px] text-gray-500 dark:text-[#9aa0a6] mt-0.5">Live heartbeat probe &bull; 9 Services</div>
        </Link>

        <Link 
          to="/users" 
          className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:border-blue-500 transition-colors bg-white dark:bg-[#202124] group"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Tenant Directory</span>
            <Users className="w-4 h-4 text-blue-500 group-hover:scale-105 transition-transform" />
          </div>
          <div className="text-sm font-medium mt-1 text-gray-900 dark:text-white">Users & Roles</div>
          <div className="text-[11px] text-gray-500 dark:text-[#9aa0a6] mt-0.5">Admin promotions & suspension</div>
        </Link>

        <Link 
          to="/domains" 
          className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:border-blue-500 transition-colors bg-white dark:bg-[#202124] group"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Edge Routing</span>
            <Globe className="w-4 h-4 text-indigo-500 group-hover:scale-105 transition-transform" />
          </div>
          <div className="text-sm font-medium mt-1 text-gray-900 dark:text-white">Custom Domains</div>
          <div className="text-[11px] text-gray-500 dark:text-[#9aa0a6] mt-0.5">DNS validation & TLS certificates</div>
        </Link>

        <Link 
          to="/audit" 
          className="p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:border-blue-500 transition-colors bg-white dark:bg-[#202124] group"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Governance</span>
            <ScrollText className="w-4 h-4 text-amber-500 group-hover:scale-105 transition-transform" />
          </div>
          <div className="text-sm font-medium mt-1 text-gray-900 dark:text-white">Audit Trail</div>
          <div className="text-[11px] text-gray-500 dark:text-[#9aa0a6] mt-0.5">Security events & operator logs</div>
        </Link>
      </div>

      {/* Summary KPI Strip */}
      <div id="summary-metrics" className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Total Projects</span>
            <FolderGit2 className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-medium text-gray-900 dark:text-white">{metrics.totalProjects}</span>
            <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Customer tenants</p>
          </div>
        </div>

        <div className="p-3 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa0a6]">
            <span className="text-[11px] font-mono uppercase tracking-wider">Deployments</span>
            <Rocket className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-medium text-gray-900 dark:text-white">{metrics.totalDeployments}</span>
            <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Release pipelines</p>
          </div>
        </div>

        <div className="p-3 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Healthy</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-medium text-emerald-600 dark:text-emerald-400">{metrics.successfulDeployments}</span>
            <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Succeeded builds</p>
          </div>
        </div>

        <div className="p-3 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Active</span>
            <Clock className="w-3.5 h-3.5 animate-spin" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-medium text-blue-600 dark:text-blue-400">{metrics.runningDeployments}</span>
            <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">In flight</p>
          </div>
        </div>

        <div className="p-3 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-[11px] font-mono uppercase tracking-wider">Failed</span>
            <XCircle className="w-3.5 h-3.5" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-medium text-red-600 dark:text-red-400">{metrics.failedDeployments}</span>
            <p className="text-[11px] text-gray-500 dark:text-[#9aa0a6] font-mono mt-0.5">Need attention</p>
          </div>
        </div>
      </div>

      {/* Cross-Tenant Projects Overview */}
      <section id="projects-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-gray-900 dark:text-white">Active Tenant Projects</h2>
            <span className="px-1.5 py-0.2 text-[11px] font-mono rounded-sm bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300">
              {projects.length}
            </span>
          </div>
          <Link
            id="link-view-all-projects"
            to="/projects"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Inspect All Projects</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 text-center bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-500 dark:text-[#9aa0a6]">
            <FolderGit2 className="w-6 h-6 mx-auto text-gray-400 mb-2" />
            <p className="text-xs">No active projects found across the platform.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.slice(0, 6).map((proj) => {
              const statusInfo = proj.latestStatus ? mapDashboardDeployStatus(proj.latestStatus) : null;
              return (
                <div
                  key={proj.id}
                  id={`project-card-${proj.id}`}
                  onClick={() => navigate('/projects')}
                  className="p-4 rounded-sm bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] hover:border-blue-500 cursor-pointer transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
                        <h3 className="font-medium text-xs text-gray-900 dark:text-white truncate">
                          {proj.name}
                        </h3>
                      </div>
                      {statusInfo && (
                        <StatusBadge status={statusInfo.type} label={statusInfo.label} />
                      )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-2 line-clamp-2 min-h-[2rem]">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-gray-200 dark:border-[#3c4043] flex items-center justify-between text-[11px] text-gray-500 dark:text-[#9aa0a6]">
                    <div className="flex items-center gap-1 font-mono">
                      <Rocket className="w-3 h-3" />
                      <span>{proj.totalDeployments} deploys</span>
                    </div>

                    <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5">
                      View details <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Global Deployment Feed */}
      <section id="deployments-section" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium text-gray-900 dark:text-white">Recent Global Deployments</h2>
            <span className="px-1.5 py-0.2 text-[11px] font-mono rounded-sm bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300">
              {recentDeployments.length}
            </span>
          </div>
          <Link
            id="link-view-all-deployments"
            to="/deployments"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>All Global Deployments</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentDeployments.length === 0 ? (
          <div
            id="deployments-empty-state"
            className="p-6 text-center bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm text-gray-500 dark:text-[#9aa0a6]"
          >
            <Layers className="w-6 h-6 mx-auto text-gray-400 mb-2" />
            <p className="text-xs font-mono">No recent deployment activity detected.</p>
          </div>
        ) : (
          <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
            <div className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {recentDeployments.slice(0, 8).map((deploy) => {
                const statusBadge = mapDashboardDeployStatus(deploy.status);

                return (
                  <div
                    key={deploy.id}
                    id={`deployment-item-${deploy.id}`}
                    onClick={() => navigate('/deployments')}
                    className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-[#27282b] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="pt-0.5 sm:pt-0">
                        <StatusBadge status={statusBadge.type} label={statusBadge.label} />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-xs text-gray-900 dark:text-white">
                            {deploy.projectName || 'Project'} / {deploy.serviceName || `Service #${deploy.serviceId}`}
                          </span>

                          <span className={`px-1.5 py-0.2 text-[10px] font-mono uppercase tracking-wider rounded-sm ${getEnvironmentColor(deploy.environment)}`}>
                            {deploy.environment}
                          </span>

                          <span className="text-[10px] text-gray-500 dark:text-[#9aa0a6] font-mono bg-gray-100 dark:bg-[#3c4043] px-1.5 py-0.2 rounded-sm">
                            v{deploy.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-[#9aa0a6] flex-wrap">
                          {deploy.commitSha && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <GitCommit className="w-3 h-3" />
                              {deploy.commitSha.slice(0, 7)}
                            </span>
                          )}

                          {deploy.commitMessage && (
                            <span className="truncate max-w-xs text-gray-600 dark:text-gray-300">
                              "{deploy.commitMessage}"
                            </span>
                          )}

                          {deploy.userName && (
                            <span>by {deploy.userName}</span>
                          )}

                          <span className="font-mono">
                            {deploy.startedAt ? format(deploy.startedAt, 'MMM dd, HH:mm') : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
