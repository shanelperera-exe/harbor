import { useState, useCallback } from 'react';
import {
  getDeploymentReport,
  formatDuration,
  type DeploymentReportResponse,
  type DeploymentReportQuery,
} from '../../services/reportService';
import { getProjects, type Project } from '../../services/projectService';
import { useEffect } from 'react';
import { Loader2, FileBarChart2, CheckCircle2, XCircle, TrendingUp, Clock, ChevronDown, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mapDeployStatus } from '../../services/deploymentService';
import { format } from 'date-fns';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { BiSolidBolt } from 'react-icons/bi';
import { Icon } from '../../components/icons';

// ── Environment colour helper (mirrors Deployments.tsx) ──────────────────────
const getEnvironmentColor = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  testId?: string;
}

function StatCard({ label, value, icon, accent = 'text-gray-900 dark:text-white', testId }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 p-5 rounded-md border border-gray-200 dark:border-[#333] bg-white dark:bg-white/[0.02]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-[#8f8f8f] font-medium">{label}</span>
        <span className="text-gray-400 dark:text-[#555]">{icon}</span>
      </div>
      <span data-testid={testId} className={`text-3xl font-semibold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DeploymentReport() {
  // Filter state
  const [projectId, setProjectId]     = useState('');
  const [environment, setEnvironment] = useState('');
  const [status, setStatus]           = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');

  // Data state
  const [projects, setProjects]       = useState<Project[]>([]);
  const [report, setReport]           = useState<DeploymentReportResponse | null>(null);
  const [loading, setLoading]         = useState(false);
  const [generated, setGenerated]     = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Load project list for filter dropdown
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  // ── Generate report ────────────────────────────────────────────────────────
  const generateReport = useCallback(async () => {
    // Client-side date validation
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Start date must be on or before end date.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const query: DeploymentReportQuery = {};
      if (projectId)   query.projectId   = projectId;
      if (environment) query.environment = environment;
      if (status)      query.status      = status;
      if (startDate)   query.startDate   = startDate;
      if (endDate)     query.endDate     = endDate;

      const result = await getDeploymentReport(query);
      setReport(result);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, [projectId, environment, status, startDate, endDate]);

  // ── Reset filters ──────────────────────────────────────────────────────────
  const reset = () => {
    setProjectId('');
    setEnvironment('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setReport(null);
    setGenerated(false);
    setError(null);
  };

  // ── Dropdown options ───────────────────────────────────────────────────────
  const projectOptions = [
    { value: '', label: 'All projects', icon: () => <Icon name="projects" className="w-4 h-4" /> },
    ...projects.map(p => ({ value: p.id.toString(), label: p.name, icon: () => <Icon name="projects" className="w-4 h-4" /> })),
  ];

  const envOptions = [
    { value: '', label: 'All environments' },
    { value: 'Production',  label: 'Production' },
    { value: 'Staging',     label: 'Staging' },
    { value: 'Development', label: 'Development' },
    { value: 'Preview',     label: 'Preview' },
  ];

  const statusOptions = [
    { value: '',          label: 'All statuses' },
    { value: 'Succeeded', label: 'Succeeded' },
    { value: 'Failed',    label: 'Failed' },
    { value: 'Running',   label: 'Running' },
    { value: 'Pending',   label: 'Pending' },
  ];

  const dropdownClass =
    'flex items-center justify-between gap-2 h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] ' +
    'bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] ' +
    'transition-colors min-w-[180px]';

  const stats = report?.statistics;

  return (
    <div className="w-full h-full p-6 lg:px-12 xl:px-20 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)]">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] lg:text-[32px] font-medium text-gray-900 dark:text-white leading-tight tracking-tight">
            <FileBarChart2 className="w-[1em] h-[1em]" aria-hidden="true" />
            Deployment Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-[#6b6b6b]">
            Select filters and generate a report to evaluate deployment activity and reliability.
          </p>
        </div>
      </div>

      <main className="flex flex-col gap-8">

        {/* ── Filter panel ────────────────────────────────────────────────── */}
        <section
          aria-label="Report filters"
          className="rounded-md border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-white/[0.02] p-5 flex flex-col gap-5"
        >
          <h2 className="text-[15px] font-semibold text-gray-800 dark:text-[#e0e0e0] flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-gray-400" />
            Report Filters
          </h2>

          <div className="flex flex-wrap gap-3">
            {/* Project */}
            <FilterDropdown
              value={projectId}
              onChange={setProjectId}
              options={projectOptions}
              placeholder="All projects"
              className={dropdownClass}
              testId="report-project-filter"
            />

            {/* Environment */}
            <FilterDropdown
              value={environment}
              onChange={setEnvironment}
              options={envOptions}
              placeholder="All environments"
              className={dropdownClass}
              testId="report-environment-filter"
            />

            {/* Status */}
            <FilterDropdown
              value={status}
              onChange={setStatus}
              options={statusOptions}
              placeholder="All statuses"
              className={dropdownClass}
              testId="report-status-filter"
            />
          </div>

          {/* Date range */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="report-start-date" className="text-xs text-gray-500 dark:text-[#8f8f8f] font-medium">
                From date
              </label>
              <input
                id="report-start-date"
                data-testid="report-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors focus:border-[#2563eb] focus:outline-none"
              />
            </div>
            <span className="text-gray-400 dark:text-[#555] text-sm mt-5">to</span>
            <div className="flex flex-col gap-1">
              <label htmlFor="report-end-date" className="text-xs text-gray-500 dark:text-[#8f8f8f] font-medium">
                To date
              </label>
              <input
                id="report-end-date"
                data-testid="report-end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#0b1221] text-gray-700 dark:text-[#c9c9c9] rounded-sm hover:bg-gray-50 dark:hover:bg-[#111c33] transition-colors focus:border-[#2563eb] focus:outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" data-testid="report-error" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              id="generate-report-btn"
              data-testid="generate-report-btn"
              onClick={generateReport}
              disabled={loading}
              className="flex items-center gap-2 h-10 px-5 rounded-sm text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileBarChart2 className="w-4 h-4" />
              )}
              {loading ? 'Generating…' : 'Generate Report'}
            </button>

            {generated && (
              <button
                data-testid="reset-report-btn"
                onClick={reset}
                className="flex items-center gap-2 h-10 px-4 rounded-sm text-sm font-medium border border-gray-300 dark:border-[#525252] text-gray-600 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#202020] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </section>

        {/* ── Statistics cards ─────────────────────────────────────────────── */}
        {generated && stats && (
          <section aria-label="Report statistics" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Deployments"
              value={stats.totalDeployments}
              icon={<FileBarChart2 className="w-4 h-4" />}
              testId="stat-total"
            />
            <StatCard
              label="Successful"
              value={stats.successfulDeployments}
              icon={<CheckCircle2 className="w-4 h-4" />}
              accent="text-emerald-600 dark:text-emerald-400"
              testId="stat-successful"
            />
            <StatCard
              label="Failed"
              value={stats.failedDeployments}
              icon={<XCircle className="w-4 h-4" />}
              accent={stats.failedDeployments > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}
              testId="stat-failed"
            />
            <StatCard
              label="Success Rate"
              value={`${stats.successRate}%`}
              icon={<TrendingUp className="w-4 h-4" />}
              accent={
                stats.totalDeployments === 0
                  ? 'text-gray-400'
                  : stats.successRate >= 80
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : stats.successRate >= 50
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-red-600 dark:text-red-400'
              }
              testId="stat-success-rate"
            />
            {stats.averageDurationSeconds != null && (
              <div className="col-span-2 sm:col-span-1">
                <StatCard
                  label="Avg. Duration"
                  value={formatDuration(stats.averageDurationSeconds)}
                  icon={<Clock className="w-4 h-4" />}
                  testId="stat-avg-duration"
                />
              </div>
            )}
          </section>
        )}

        {/* ── Results table ────────────────────────────────────────────────── */}
        {generated && report && (
          <section aria-label="Report results">
            {report.items.length === 0 ? (
              /* AC8 – empty results: display appropriate empty state, no misleading stats */
              <div data-testid="report-empty" className="py-14 text-center text-gray-500 dark:text-[#6b6b6b]">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No deployments match the selected filters</div>
                  <div className="text-xs">Try adjusting your filters or selecting a broader date range.</div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">

                {/* Table header */}
                <div className="flex flex-row items-center gap-4 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    Deployment
                    <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                      {report.items.length}
                    </span>
                  </div>
                  <div className="w-[150px] shrink-0 hidden md:block">Project / Service</div>
                  <div className="w-[120px] shrink-0">Status</div>
                  <div className="w-[120px] shrink-0 hidden sm:block">Environment</div>
                  <div className="w-[90px]  shrink-0 hidden lg:block text-right">Duration</div>
                  <div className="w-[120px] shrink-0 text-right">Started</div>
                </div>

                {/* Table rows */}
                {report.items.map((item, index) => {
                  const mappedStatus = mapDeployStatus(item.status);
                  return (
                    <div
                      key={item.id}
                      data-testid="report-row"
                      className={`flex flex-row items-center gap-4 bg-transparent px-4 h-[56px] ${
                        index !== report.items.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''
                      }`}
                    >
                      {/* Deployment name + id */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-medium">
                          {item.commitMessage || item.version || 'Manual Deploy'}
                        </span>
                        <span className="text-[13px] text-gray-500 dark:text-[#8f8f8f] font-mono mt-0.5 truncate hidden sm:block">
                          {item.publicId ? item.publicId.replace('dep-', '').substring(0, 9) : item.id}
                        </span>
                      </div>

                      {/* Project / Service */}
                      <div className="w-[150px] shrink-0 hidden md:flex flex-col justify-center">
                        <span className="text-[14px] font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                          <Icon name="projects" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {item.projectName || '—'}
                        </span>
                        <span className="text-[12px] text-gray-500 dark:text-[#8f8f8f] truncate mt-0.5">
                          {item.serviceName || ''}
                        </span>
                      </div>

                      {/* Status */}
                      <div data-testid="report-row-status" className="w-[120px] flex items-center gap-2 shrink-0 text-[14px]">
                        <StatusBadge status={mappedStatus.type} label={mappedStatus.label} />
                      </div>

                      {/* Environment */}
                      <div className="w-[120px] shrink-0 hidden sm:block">
                        <span className={`inline-flex items-center justify-center rounded-md font-medium h-[24px] px-2.5 text-[13px] ${getEnvironmentColor(item.environment || 'Production')}`}>
                          {(item.environment || 'Production').toLowerCase() === 'production' ? (
                            <BiSolidBolt className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                          ) : (
                            <Icon name="environmentBurst" className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                          )}
                          {item.environment || 'Production'}
                        </span>
                      </div>

                      {/* Duration */}
                      <div className="w-[90px] shrink-0 hidden lg:block text-right text-[14px] text-gray-600 dark:text-[#8f8f8f] tabular-nums">
                        {formatDuration(item.durationSeconds)}
                      </div>

                      {/* Started at */}
                      <div className="w-[120px] shrink-0 text-right text-[14px] text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {format(new Date(item.startedAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
