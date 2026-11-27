import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, MotionConfig } from 'motion/react';
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
  LayoutDashboard,
  FileBarChart2,
  ArrowUpRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';
import DashboardInsightsPanel from './components/DashboardInsightsPanel';

type StatusFilter = 'all' | 'ready' | 'running' | 'error';

const getEnvironmentColor = (env: string) => {
  const e = (env || '').toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

function formatDeployDuration(startedAt?: string | null, completedAt?: string | null): string | null {
  if (!startedAt || !completedAt) return null;
  const secs = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (secs <= 0 || !Number.isFinite(secs)) return null;
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to retrieve dashboard information.';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const filteredDeployments = useMemo(() => {
    if (statusFilter === 'all') return recentDeployments;
    return recentDeployments.filter((d) => mapDashboardDeployStatus(d.status).type === statusFilter);
  }, [recentDeployments, statusFilter]);

  const maxProjectDeploys = useMemo(
    () => Math.max(1, ...projects.map((p) => p.totalDeployments)),
    [projects]
  );

  const completedTotal = metrics.successfulDeployments + metrics.failedDeployments;
  const successRatePct = completedTotal > 0 ? Math.round((metrics.successfulDeployments / completedTotal) * 100) : null;

  if (loading) {
    return (
      <div id="dashboard-loading" className="flex flex-col items-center justify-center w-full h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb] dark:text-[#3b82f6]" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">Loading deployment dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="dashboard-error" className="flex flex-col items-center justify-center w-full h-[60vh] gap-4 px-4 text-center">
        <div className="w-12 h-12 rounded-md border border-red-500/30 bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Failed to load dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">{error}</p>
        </div>
        <button
          id="btn-retry-dashboard"
          onClick={() => loadData(false)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // Friendly onboarding empty state when user has no projects yet
  if (projects.length === 0 && recentDeployments.length === 0) {
    return (
      <MotionConfig reducedMotion="user">
        <div
          id="dashboard-empty"
          className="flex flex-col items-center justify-center w-full min-h-[72vh] harbor-grid-bg bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white text-center px-4 py-12 transition-colors duration-300"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl w-full p-8 md:p-10 border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#111420] rounded-md flex flex-col items-center"
          >
            <div className="w-12 h-12 rounded-md bg-[#2563eb]/10 border border-[#2563eb]/30 flex items-center justify-center text-[#2563eb] dark:text-[#3b82f6] mb-5">
              <Rocket className="w-6 h-6" />
            </div>
            <h1 className="font-['Roobert',sans-serif] text-3xl font-medium mb-3 tracking-tight">
              Welcome to Harbor
            </h1>
            <p className="text-[16px] text-gray-600 dark:text-[#a1a1aa] max-w-md mx-auto mb-8 leading-relaxed">
              You don&apos;t have any projects yet. Create a new project to get started.
            </p>

            <div className="grid grid-cols-3 gap-2.5 w-full mb-8 text-left font-mono text-[11px]">
              {[
                { step: '01', label: 'Create Project' },
                { step: '02', label: 'Connect GitHub' },
                { step: '03', label: 'Ship & Monitor' },
              ].map((s) => (
                <div
                  key={s.step}
                  className="p-3 border border-gray-200 dark:border-[#2a2f42] bg-[#fafafa] dark:bg-[#0b0d14] rounded-md"
                >
                  <span className="text-[#2563eb] dark:text-[#3b82f6] block">{s.step}</span>
                  <span className="text-gray-800 dark:text-gray-200 mt-0.5 block">{s.label}</span>
                </div>
              ))}
            </div>

            <button
              id="btn-new-project-empty"
              data-testid="btn-new-project-empty"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-11 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-[15px] transition-colors flex items-center justify-center rounded-md gap-1.5 cursor-pointer"
            >
              New Project <span className="text-lg leading-none mb-0.5">+</span>
            </button>
          </motion.div>
        </div>
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => loadData(true)}
        />
      </MotionConfig>
    );
  }

  const metricCards = [
    {
      id: 'metric-total-projects',
      label: 'Projects',
      value: metrics.totalProjects,
      sub: 'Accessible workspaces',
      icon: <FolderGit2 className="w-4 h-4 text-[#2563eb] dark:text-[#3b82f6]" />,
      valueClass: 'text-gray-900 dark:text-white',
      accentColor: '#2563eb',
    },
    {
      id: 'metric-total-deployments',
      label: 'Deployments',
      value: metrics.totalDeployments,
      sub: 'Total triggered runs',
      icon: <Rocket className="w-4 h-4 text-[#6c35f5] dark:text-[#8b5cf6]" />,
      valueClass: 'text-gray-900 dark:text-white',
      accentColor: '#6c35f5',
    },
    {
      id: 'metric-successful',
      label: 'Successful',
      value: metrics.successfulDeployments,
      sub: successRatePct !== null ? `${successRatePct}% pass rate` : 'Succeeded',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#37cd8f]" />,
      valueClass: 'text-emerald-600 dark:text-[#37cd8f]',
      accentColor: '#10b981',
    },
    {
      id: 'metric-running',
      label: 'Running',
      value: metrics.runningDeployments,
      sub: metrics.runningDeployments > 0 ? 'Pipelines in progress' : 'Active / In Progress',
      icon: <Clock className={`w-4 h-4 text-[#2563eb] dark:text-[#3b82f6] ${metrics.runningDeployments > 0 ? 'animate-spin' : ''}`} />,
      valueClass: 'text-[#2563eb] dark:text-[#3b82f6]',
      accentColor: '#3b82f6',
    },
    {
      id: 'metric-failed',
      label: 'Failed',
      value: metrics.failedDeployments,
      sub: 'Failed deployments',
      icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
      valueClass: 'text-red-600 dark:text-red-400',
      accentColor: '#ef4444',
      spanClass: 'col-span-2 md:col-span-1',
    },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div id="dashboard-container" className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20 space-y-8">
        {/* Top Header with unified SectionTitle */}
        <SectionTitle
          icon={<LayoutDashboard className="w-6 h-6" />}
          title="Deployment Dashboard"
          description="Centralized overview of your accessible projects, release health, and live deployment activity."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                to="/reports"
                className="inline-flex items-center gap-1.5 h-10 px-3.5 text-sm font-medium text-gray-700 dark:text-[#d1d5e3] bg-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-300 dark:border-[#525252] rounded-md transition-colors"
              >
                <FileBarChart2 className="w-4 h-4 text-[#2563eb] dark:text-[#3b82f6]" />
                <span>Reports</span>
              </Link>

              <button
                id="btn-refresh-dashboard"
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 text-sm font-medium text-gray-700 dark:text-[#d1d5e3] bg-transparent hover:bg-gray-100 dark:hover:bg-white/[0.06] border border-gray-300 dark:border-[#525252] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                id="btn-new-project"
                data-testid="btn-new-project"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          }
        />

        {/* Live Status Banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="px-4 py-2.5 border border-gray-300 dark:border-[#525252] bg-[#fafafa] dark:bg-white/[0.02] rounded-md flex flex-wrap items-center justify-between gap-3 font-mono text-[12px]"
        >
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                metrics.runningDeployments > 0 ? 'bg-[#2563eb]' : 'bg-[#37cd8f]'
              }`}
            />
            <span className="text-gray-800 dark:text-gray-200">
              {metrics.runningDeployments > 0
                ? `${metrics.runningDeployments} active deployment${metrics.runningDeployments === 1 ? '' : 's'} currently in progress`
                : 'Control plane healthy • Ready to deploy'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 dark:text-[#8b92a9]">
            <span>{projects.length} {projects.length === 1 ? 'project' : 'projects'} tracked</span>
            <span>•</span>
            <span>{recentDeployments.length} recent events</span>
          </div>
        </motion.div>

        {/* Summary Metrics Cards */}
        <div id="summary-metrics" className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {metricCards.map((card, idx) => (
            <motion.div
              key={card.id}
              id={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              className={`relative overflow-hidden p-5 rounded-md bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] hover:border-[#2563eb] transition-colors flex flex-col justify-between ${card.spanClass || ''}`}
            >
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ backgroundColor: card.accentColor }}
              />
              <div className="flex items-center justify-between text-gray-500 dark:text-[#9aa3bc]">
                <span className="text-[11.5px] uppercase font-mono tracking-wider">{card.label}</span>
                {card.icon}
              </div>
              <div className="mt-3">
                <span className={`font-['Roobert',sans-serif] text-[30px] leading-none font-medium tabular-nums ${card.valueClass}`}>
                  {card.value}
                </span>
                <p className="text-xs text-gray-500 dark:text-[#8b92a9] mt-1.5">{card.sub}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Operational Insights & Animated Graphs */}
        <DashboardInsightsPanel
          metrics={metrics}
          recentDeployments={recentDeployments}
          projects={projects}
          onSelectProject={(proj) => navigate(`/projects/${proj.publicId || proj.id}/environments`)}
        />

        {/* Accessible Projects Section */}
        <section id="projects-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="font-['Roobert',sans-serif] text-[19px] font-medium text-gray-900 dark:text-white">
                Accessible Projects
              </h2>
              <span className="px-2 py-0.5 font-mono text-xs font-medium rounded-md bg-[#2563eb]/10 text-[#2563eb] dark:text-[#3b82f6] border border-[#2563eb]/20">
                {projects.length}
              </span>
            </div>
            <Link
              id="link-view-all-projects"
              to="/projects"
              className="text-sm font-medium text-[#2563eb] dark:text-[#3b82f6] hover:underline flex items-center gap-1 transition-colors"
            >
              <span>All Projects</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj, idx) => {
              const statusInfo = proj.latestStatus ? mapDashboardDeployStatus(proj.latestStatus) : null;
              const activityPct = Math.round((proj.totalDeployments / maxProjectDeploys) * 100);
              return (
                <motion.div
                  key={proj.id}
                  id={`project-card-${proj.id}`}
                  data-testid={`project-card-${proj.id}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3) }}
                  onClick={() => navigate(`/projects/${proj.publicId || proj.id}/environments`)}
                  className="group p-5 rounded-md bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] hover:border-[#2563eb] cursor-pointer transition-colors flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-[#2563eb]/10 border border-[#2563eb]/20 flex items-center justify-center text-[#2563eb] dark:text-[#3b82f6] shrink-0">
                          <Icon name="projects" className="w-4 h-4" />
                        </div>
                        <h3 className="font-['Roobert',sans-serif] font-medium text-[17px] text-gray-900 dark:text-white group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors truncate">
                          {proj.name}
                        </h3>
                      </div>
                      {statusInfo && (
                        <StatusBadge status={statusInfo.type} label={statusInfo.label} />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-[#a1a1aa] mt-3 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                      {proj.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Relative Activity Share Bar */}
                    <div className="h-1 w-full bg-gray-100 dark:bg-[#24283a] rounded-[1px] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(proj.totalDeployments > 0 ? 8 : 0, activityPct)}%` }}
                        transition={{ duration: 0.6, delay: 0.15 + idx * 0.04 }}
                        className="h-full bg-[#2563eb]"
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-[#8b92a9]">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 font-mono">
                          <Rocket className="w-3.5 h-3.5 text-[#2563eb] dark:text-[#3b82f6]" />
                          <span>{proj.totalDeployments} {proj.totalDeployments === 1 ? 'deployment' : 'deployments'}</span>
                        </span>
                        {proj.latestDeploymentTime && (
                          <span className="hidden sm:inline text-gray-400 dark:text-[#6e748b]">
                            • {formatDistanceToNow(new Date(proj.latestDeploymentTime), { addSuffix: true })}
                          </span>
                        )}
                      </div>

                      <span className="text-[#2563eb] dark:text-[#3b82f6] font-medium inline-flex items-center gap-0.5">
                        View <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Recent Deployment Activity Section */}
        <section id="deployments-section" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="font-['Roobert',sans-serif] text-[19px] font-medium text-gray-900 dark:text-white">
                Recent Deployment Activity
              </h2>
              <span className="px-2 py-0.5 font-mono text-xs font-medium rounded-md bg-[#2563eb]/10 text-[#2563eb] dark:text-[#3b82f6] border border-[#2563eb]/20">
                {filteredDeployments.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Interactive Status Filter Pills */}
              {recentDeployments.length > 0 && (
                <div className="inline-flex items-center p-1 border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] rounded-md font-mono text-[11.5px]">
                  {(
                    [
                      { id: 'all', label: 'All' },
                      { id: 'ready', label: 'Success' },
                      { id: 'running', label: 'Running' },
                      { id: 'error', label: 'Failed' },
                    ] as const
                  ).map((tab) => {
                    const active = statusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setStatusFilter(tab.id)}
                        className={`relative px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                          active
                            ? 'text-white font-medium'
                            : 'text-gray-600 dark:text-[#9aa3bc] hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="dashboard-deploy-filter"
                            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                            className="absolute inset-0 bg-[#2563eb] rounded-md"
                          />
                        )}
                        <span className="relative z-10">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <Link
                id="link-view-all-deployments"
                to="/deployments"
                className="text-sm font-medium text-[#2563eb] dark:text-[#3b82f6] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>All Deployments</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {filteredDeployments.length === 0 ? (
            <div
              id="deployments-empty-state"
              className="p-8 text-center bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] rounded-md text-gray-500 dark:text-gray-400"
            >
              <Layers className="w-8 h-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm">
                {recentDeployments.length === 0
                  ? 'No recent deployments found for your accessible projects.'
                  : 'No deployments match the selected status filter.'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-white dark:bg-transparent">
              {/* Table Header */}
              <div className="flex flex-row items-center gap-4 xl:gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-5 py-3.5 text-[12px] font-medium uppercase tracking-wider font-mono">
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  Project / Service
                </div>
                <div className="w-[120px] shrink-0">Status</div>
                <div className="w-[120px] shrink-0 hidden sm:block">Environment</div>
                <div className="w-[100px] shrink-0 hidden md:block">Commit</div>
                <div className="w-[80px] shrink-0 hidden lg:block">Duration</div>
                <div className="w-[140px] shrink-0 text-right">Time</div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-[#525252]">
                {filteredDeployments.map((deploy) => {
                  const statusBadge = mapDashboardDeployStatus(deploy.status);
                  const targetUrl = `/projects/${deploy.projectId}/services/${deploy.serviceId}/deployments/${deploy.publicId || deploy.id}`;
                  const dur = formatDeployDuration(deploy.startedAt, deploy.completedAt);

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
                            <span className="font-medium text-[14.5px] text-gray-900 dark:text-white group-hover:text-[#2563eb] dark:group-hover:text-[#3b82f6] transition-colors truncate">
                              {deploy.projectName || 'Project'} / {deploy.serviceName || `Service #${deploy.serviceId}`}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                              v{deploy.version}
                            </span>
                          </div>

                          {deploy.commitMessage && (
                            <div className="text-xs text-gray-500 dark:text-[#8b92a9] truncate max-w-sm">
                              <span>&quot;{deploy.commitMessage}&quot;</span>
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
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-md uppercase tracking-wider font-mono ${getEnvironmentColor(deploy.environment)}`}>
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

                      {/* Duration */}
                      <div className="w-[80px] shrink-0 hidden lg:block font-mono text-xs text-gray-600 dark:text-[#9aa3bc] tabular-nums">
                        {dur ?? '—'}
                      </div>

                      {/* Time */}
                      <div className="w-[140px] shrink-0 text-right font-mono text-xs text-gray-500 dark:text-[#8b92a9] tabular-nums">
                        {deploy.startedAt ? format(new Date(deploy.startedAt), 'MMM d, HH:mm') : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => loadData(true)}
        />
      </div>
    </MotionConfig>
  );
}
