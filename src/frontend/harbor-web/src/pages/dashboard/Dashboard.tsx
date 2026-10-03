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
  Layers
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
            className="h-10 px-4 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-[15px] transition-colors flex items-center justify-center rounded-sm gap-1 shadow-sm"
          >
            New Project <span className="text-lg leading-none mb-0.5">+</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div id="dashboard-container" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#383838]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Deployment Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Centralized overview of your accessible projects and recent deployment operational activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-refresh-dashboard"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#404040] hover:bg-gray-50 dark:hover:bg-[#252525] rounded-sm transition-colors disabled:opacity-50"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <Link
            id="btn-new-project"
            to="/projects/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-sm font-medium rounded-sm transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </Link>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div id="summary-metrics" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div
          id="metric-total-projects"
          className="p-4 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs uppercase font-mono tracking-wider">Projects</span>
            <FolderGit2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalProjects}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Accessible projects</p>
          </div>
        </div>

        <div
          id="metric-total-deployments"
          className="p-4 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
            <span className="text-xs uppercase font-mono tracking-wider">Deployments</span>
            <Rocket className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total triggered</p>
          </div>
        </div>

        <div
          id="metric-successful"
          className="p-4 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <span className="text-xs uppercase font-mono tracking-wider">Successful</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">{metrics.successfulDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Succeeded</p>
          </div>
        </div>

        <div
          id="metric-running"
          className="p-4 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
            <span className="text-xs uppercase font-mono tracking-wider">Running</span>
            <Clock className="w-4 h-4 animate-spin" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{metrics.runningDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active / In Progress</p>
          </div>
        </div>

        <div
          id="metric-failed"
          className="p-4 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] shadow-sm flex flex-col justify-between col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-red-600 dark:text-red-400">
            <span className="text-xs uppercase font-mono tracking-wider">Failed</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-red-600 dark:text-red-400">{metrics.failedDeployments}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Failed deployments</p>
          </div>
        </div>
      </div>

      {/* Accessible Projects Section */}
      <section id="projects-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Accessible Projects</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-300">
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
                className="group p-5 rounded-sm bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-sm bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Icon name="projects" className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
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

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#383838] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Deployment Activity</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-[#333] text-gray-700 dark:text-gray-300">
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
            className="p-8 text-center bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] rounded-sm text-gray-500 dark:text-gray-400"
          >
            <Layers className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm">No recent deployments found for your accessible projects.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[oklch(0.24_0.03_263.45)] border border-gray-200 dark:border-[#3d3d3d] rounded-sm shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-[#383838]">
              {recentDeployments.map((deploy) => {
                const statusBadge = mapDashboardDeployStatus(deploy.status);
                const targetUrl = `/projects/${deploy.projectId}/services/${deploy.serviceId}/deployments/${deploy.publicId || deploy.id}`;

                return (
                  <div
                    key={deploy.id}
                    id={`deployment-item-${deploy.id}`}
                    data-testid={`deployment-item-${deploy.id}`}
                    onClick={() => navigate(targetUrl)}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-[#252525] cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Distinguishable Status Indicator */}
                      <div className="pt-0.5 sm:pt-0">
                        <StatusBadge status={statusBadge.type} label={statusBadge.label} />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {deploy.projectName || 'Project'} / {deploy.serviceName || `Service #${deploy.serviceId}`}
                          </span>

                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-sm uppercase tracking-wider ${getEnvironmentColor(deploy.environment)}`}>
                            {deploy.environment}
                          </span>

                          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-[#333] px-1.5 py-0.5 rounded-sm">
                            v{deploy.version}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                          {deploy.commitSha && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <GitCommit className="w-3.5 h-3.5" />
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

                          <span>
                            {deploy.startedAt ? format(new Date(deploy.startedAt), 'MMM d, yyyy HH:mm') : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:underline flex items-center gap-1">
                        Details <ChevronRight className="w-3.5 h-3.5" />
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
