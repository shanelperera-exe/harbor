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
import { Icon } from '../../components/icons';
import SectionTitle from '../../components/ui/SectionTitle';
import {
  Loader2,
  FolderGit2,
  Rocket,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  GitCommit,
  Layers,
  LayoutDashboard
} from 'lucide-react';
import { format } from 'date-fns';

const getEnvironmentColor = (env: string) => {
  const e = (env || '').toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
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
      setError(err?.message || 'Unable to retrieve dashboard information.');
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
      <div id="dashboard-loading" className="flex flex-col items-center justify-center w-full h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading deployment dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="dashboard-error" className="flex flex-col items-center justify-center w-full h-[60vh] gap-4 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Failed to load dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
        </div>
        <button
          id="btn-retry-dashboard"
          onClick={() => loadData(false)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // When user has no projects, present the friendly onboarding empty state
  if (projects.length === 0 && recentDeployments.length === 0) {
    return (
      <div id="dashboard-empty" className="flex flex-col items-center justify-center w-full min-h-[60vh] bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white text-center px-4 transition-colors duration-300">
        <h1 className="text-2xl font-medium mb-4 tracking-tight">Welcome to Harbor</h1>
        <p className="text-[16px] text-gray-500 dark:text-[#a1a1aa] max-w-md mx-auto mb-8 transition-colors duration-300">
          You don't have any projects yet. Create a new project to get started.
        </p>
        <div className="flex gap-4">
          <Link
            id="btn-new-project-empty"
            to="/projects/new"
            className="h-10 px-4 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-[15px] transition-colors flex items-center justify-center rounded-sm gap-1"
          >
            New Project <span className="text-lg leading-none mb-0.5">+</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20 space-y-8">
      {/* Top Header with unified SectionTitle */}
      <SectionTitle
        icon={<LayoutDashboard className="w-6 h-6" />}
        title="Deployment Dashboard"
        description="Centralized overview of your accessible projects and recent deployment operational activity."
        actions={
          <div className="flex items-center gap-3">
            <button
              id="btn-refresh-dashboard"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-gray-700 dark:text-[#ccc] bg-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-300 dark:border-[#525252] rounded-sm transition-colors disabled:opacity-50"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link
              id="btn-new-project"
              to="/projects/new"
              className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </Link>
          </div>
        }
      />

      {/* Summary Metrics Cards */}
      <div id="summary-metrics" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div
          id="metric-total-projects"
          className="p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs uppercase font-mono tracking-wider">Projects</span>
            <FolderGit2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-medium tabular-nums text-gray-900 dark:text-white">{metrics.totalProjects}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Accessible projects</p>
          </div>
        </div>

        <div
          id="metric-total-deployments"
          className="p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs uppercase font-mono tracking-wider">Deployments</span>
            <Rocket className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-medium tabular-nums text-gray-900 dark:text-white">{metrics.totalDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total triggered</p>
          </div>
        </div>

        <div
          id="metric-successful"
          className="p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <span className="text-xs uppercase font-mono tracking-wider">Successful</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-medium tabular-nums text-green-600 dark:text-green-400">{metrics.successfulDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Succeeded</p>
          </div>
        </div>

        <div
          id="metric-running"
          className="p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs uppercase font-mono tracking-wider">Running</span>
            <Clock className="w-4 h-4 animate-spin" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-medium tabular-nums text-blue-600 dark:text-blue-400">{metrics.runningDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active / In Progress</p>
          </div>
        </div>

        <div
          id="metric-failed"
          className="p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-xs uppercase font-mono tracking-wider">Failed</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-medium tabular-nums text-red-600 dark:text-red-400">{metrics.failedDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Failed deployments</p>
          </div>
        </div>
      </div>

      {/* Accessible Projects Section */}
      <section id="projects-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-medium text-gray-900 dark:text-white">Accessible Projects</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
              {projects.length}
            </span>
          </div>
          <Link
            id="link-view-all-projects"
            to="/projects"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>All Projects</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const statusInfo = proj.latestStatus ? mapDashboardDeployStatus(proj.latestStatus) : null;
            return (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                data-testid={`project-card-${proj.id}`}
                onClick={() => navigate(`/projects/${proj.publicId || proj.id}/environments`)}
                className="group p-5 rounded-sm bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] hover:border-[#2563eb] cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon name="projects" className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-[16px] text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {proj.name}
                      </h3>
                    </div>
                    {statusInfo && (
                      <StatusBadge status={statusInfo.type} label={statusInfo.label} />
                    )}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2 min-h-[2.5rem]">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5" />
                    <span>{proj.totalDeployments} {proj.totalDeployments === 1 ? 'deployment' : 'deployments'}</span>
                  </div>

                  <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Deployment Activity Section */}
      <section id="deployments-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-medium text-gray-900 dark:text-white">Recent Deployment Activity</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
              {recentDeployments.length}
            </span>
          </div>
          <Link
            id="link-view-all-deployments"
            to="/deployments"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <span>All Deployments</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {recentDeployments.length === 0 ? (
          <div
            id="deployments-empty-state"
            className="p-8 text-center bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] rounded-sm text-gray-500 dark:text-gray-400"
          >
            <Layers className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm">No recent deployments found for your accessible projects.</p>
          </div>
        ) : (
          <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
            {/* Table Header */}
            <div className="flex flex-row items-center gap-4 xl:gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-5 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
              <div className="flex-1 min-w-[200px] flex items-center gap-2">
                Project / Service
              </div>
              <div className="w-[120px] shrink-0">Status</div>
              <div className="w-[120px] shrink-0 hidden sm:block">Environment</div>
              <div className="w-[100px] shrink-0 hidden md:block">Commit</div>
              <div className="w-[140px] shrink-0 text-right">Time</div>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-[#525252]">
              {recentDeployments.map((deploy) => {
                const statusBadge = mapDashboardDeployStatus(deploy.status);
                const targetUrl = `/projects/${deploy.projectId}/services/${deploy.serviceId}/deployments/${deploy.publicId || deploy.id}`;

                return (
                  <div
                    key={deploy.id}
                    id={`deployment-item-${deploy.id}`}
                    data-testid={`deployment-item-${deploy.id}`}
                    onClick={() => navigate(targetUrl)}
                    className="px-5 py-3.5 flex flex-row items-center gap-4 xl:gap-8 hover:bg-gray-50 dark:hover:bg-white/[0.04] cursor-pointer transition-colors group"
                  >
                    {/* Project / Service */}
                    <div className="flex-1 min-w-[200px] flex items-center gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[14.5px] text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {deploy.projectName || 'Project'} / {deploy.serviceName || `Service #${deploy.serviceId}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-xs">
                            v{deploy.version}
                          </span>
                        </div>

                        {deploy.commitMessage && (
                          <div className="text-xs text-gray-500 dark:text-[#888] truncate max-w-sm">
                            <span>"{deploy.commitMessage}"</span>
                            {deploy.userName && (
                              <>
                                <span> · </span>
                                <span>by {deploy.userName}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="w-[120px] shrink-0">
                      <StatusBadge status={statusBadge.type} label={statusBadge.label} />
                    </div>

                    {/* Environment */}
                    <div className="w-[120px] shrink-0 hidden sm:block">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-xs uppercase tracking-wider ${getEnvironmentColor(deploy.environment)}`}>
                        {deploy.environment}
                      </span>
                    </div>

                    {/* Commit */}
                    <div className="w-[100px] shrink-0 hidden md:block">
                      {deploy.commitSha ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-gray-600 dark:text-gray-300">
                          <GitCommit className="w-3.5 h-3.5 text-gray-400" />
                          {deploy.commitSha.slice(0, 7)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>

                    {/* Time */}
                    <div className="w-[140px] shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                      {deploy.startedAt ? format(new Date(deploy.startedAt), 'MMM d, HH:mm') : '—'}
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
