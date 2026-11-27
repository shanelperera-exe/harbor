import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, MotionConfig, AnimatePresence } from 'motion/react';
import {
  getDeploymentReport,
  formatDuration,
  type DeploymentReportResponse,
  type DeploymentReportQuery,
  type DeploymentReportItem,
} from '../../services/reportService';
import { getProjects, type Project } from '../../services/projectService';
import {
  Loader2,
  FileBarChart2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Download,
  FileJson,
  Printer,
  Search,
  ArrowUpDown,
  GitCommit,
  SlidersHorizontal,
  X,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mapDeployStatus } from '../../services/deploymentService';
import { format, subDays } from 'date-fns';
import FilterDropdown from '../../components/ui/FilterDropdown';
import { BiSolidBolt } from 'react-icons/bi';
import { Icon } from '../../components/icons';
import SectionTitle from '../../components/ui/SectionTitle';
import ReportInsightsPanel from './components/ReportInsightsPanel';

type SortOption = 'newest' | 'oldest' | 'longest' | 'shortest';
type DatePreset = '7d' | '30d' | '90d' | 'all' | 'custom';

// ── Environment colour helper (mirrors Deployments.tsx) ──────────────────────
const getEnvironmentColor = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

// ── CSV / JSON export helpers ────────────────────────────────────────────────
function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadBlob(content: string, mimeType: string, filename: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent?: string;
  railColor?: string;
  testId?: string;
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent = 'text-gray-900 dark:text-white',
  railColor = '#2563eb',
  testId,
}: StatCardProps) {
  return (
    <div className="relative overflow-hidden flex flex-col justify-between gap-2 p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02]">
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ backgroundColor: railColor }}
      />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f] font-medium">
          {label}
        </span>
        <span className="text-gray-400 dark:text-[#8f8f8f]">{icon}</span>
      </div>
      <div className="mt-1">
        <span data-testid={testId} className={`font-['Roobert',sans-serif] text-3xl font-medium tabular-nums ${accent}`}>
          {value}
        </span>
        {sub && <p className="text-xs text-gray-500 dark:text-[#8f8f8f] mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DeploymentReport() {
  // Filter state
  const [projectId, setProjectId] = useState('');
  const [environment, setEnvironment] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePreset, setActivePreset] = useState<DatePreset>('all');

  // Client-side table exploration state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [report, setReport] = useState<DeploymentReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load project list for filter dropdown
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {});
  }, []);

  // ── Core fetch runner ──────────────────────────────────────────────────────
  const runReportQuery = useCallback(async (query: DeploymentReportQuery) => {
    if (query.startDate && query.endDate && new Date(query.startDate) > new Date(query.endDate)) {
      setError('Start date must be on or before end date.');
      return;
    }

    setLoading(true);
    setError(null);
    setExpandedRowId(null);
    try {
      const result = await getDeploymentReport(query);
      setReport(result);
      setGenerated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async () => {
    const query: DeploymentReportQuery = {};
    if (projectId) query.projectId = projectId;
    if (environment) query.environment = environment;
    if (status) query.status = status;
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;
    await runReportQuery(query);
  }, [projectId, environment, status, startDate, endDate, runReportQuery]);

  // ── Date preset helper ─────────────────────────────────────────────────────
  const applyDatePreset = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    const today = new Date();
    setEndDate(format(today, 'yyyy-MM-dd'));
    setStartDate(format(subDays(today, days), 'yyyy-MM-dd'));
  };

  // ── Quick report template runner ───────────────────────────────────────────
  const runQuickTemplate = async (template: 'prod30' | 'failures' | 'all') => {
    const today = new Date();
    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');
    const todayStr = format(today, 'yyyy-MM-dd');

    if (template === 'prod30') {
      setProjectId('');
      setEnvironment('Production');
      setStatus('');
      setStartDate(thirtyDaysAgo);
      setEndDate(todayStr);
      setActivePreset('30d');
      await runReportQuery({ environment: 'Production', startDate: thirtyDaysAgo, endDate: todayStr });
    } else if (template === 'failures') {
      setProjectId('');
      setEnvironment('');
      setStatus('Failed');
      setStartDate('');
      setEndDate('');
      setActivePreset('all');
      await runReportQuery({ status: 'Failed' });
    } else {
      setProjectId('');
      setEnvironment('');
      setStatus('');
      setStartDate('');
      setEndDate('');
      setActivePreset('all');
      await runReportQuery({});
    }
  };

  // ── Reset filters ──────────────────────────────────────────────────────────
  const reset = () => {
    setProjectId('');
    setEnvironment('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setActivePreset('all');
    setSearchQuery('');
    setSortBy('newest');
    setExpandedRowId(null);
    setReport(null);
    setGenerated(false);
    setError(null);
  };

  // ── Active filter pills ────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (projectId) {
      const name = projects.find((p) => p.id.toString() === projectId)?.name ?? `Project #${projectId}`;
      chips.push({ key: 'project', label: `Project: ${name}`, onClear: () => setProjectId('') });
    }
    if (environment) {
      chips.push({ key: 'env', label: `Env: ${environment}`, onClear: () => setEnvironment('') });
    }
    if (status) {
      chips.push({ key: 'status', label: `Status: ${status}`, onClear: () => setStatus('') });
    }
    if (startDate || endDate) {
      const rangeLabel = startDate && endDate ? `${startDate} → ${endDate}` : startDate ? `From ${startDate}` : `Until ${endDate}`;
      chips.push({
        key: 'date',
        label: rangeLabel,
        onClear: () => {
          setStartDate('');
          setEndDate('');
          setActivePreset('all');
        },
      });
    }
    return chips;
  }, [projectId, environment, status, startDate, endDate, projects]);

  // ── Filtered + sorted report items ─────────────────────────────────────────
  const displayedItems = useMemo<DeploymentReportItem[]>(() => {
    if (!report) return [];
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? report.items.filter((item) =>
          [
            item.publicId,
            item.projectName,
            item.serviceName,
            item.commitMessage,
            item.commitSha,
            item.version,
            item.environment,
            item.userName,
            item.status,
          ]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(q))
        )
      : [...report.items];

    filtered.sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      if (sortBy === 'longest') return (b.durationSeconds ?? -1) - (a.durationSeconds ?? -1);
      if (sortBy === 'shortest') return (a.durationSeconds ?? Number.MAX_SAFE_INTEGER) - (b.durationSeconds ?? Number.MAX_SAFE_INTEGER);
      return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
    });

    return filtered;
  }, [report, searchQuery, sortBy]);

  // ── Exports ────────────────────────────────────────────────────────────────
  const handleExportCsv = () => {
    if (!report || report.items.length === 0) return;
    const headers = [
      'Deployment ID',
      'Project',
      'Service',
      'Environment',
      'Status',
      'Version',
      'Commit SHA',
      'Commit Message',
      'Triggered By',
      'Duration (s)',
      'Started At',
      'Completed At',
      'Failure Reason',
    ];
    const rows = displayedItems.map((item) =>
      [
        item.publicId || item.id,
        item.projectName,
        item.serviceName,
        item.environment,
        item.status,
        item.version,
        item.commitSha,
        item.commitMessage,
        item.userName,
        item.durationSeconds,
        item.startedAt,
        item.completedAt,
        item.failureReason,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    downloadBlob(csv, 'text/csv;charset=utf-8;', `harbor-deployment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const handleExportJson = () => {
    if (!report) return;
    const payload = JSON.stringify({ ...report, items: displayedItems }, null, 2);
    downloadBlob(payload, 'application/json;charset=utf-8;', `harbor-deployment-report-${format(new Date(), 'yyyy-MM-dd')}.json`);
  };

  // ── Dropdown options ───────────────────────────────────────────────────────
  const projectOptions = [
    { value: '', label: 'All projects', icon: () => <Icon name="projects" className="w-4 h-4" /> },
    ...projects.map((p) => ({
      value: p.id.toString(),
      label: p.name,
      icon: () => <Icon name="projects" className="w-4 h-4" />,
    })),
  ];

  const envOptions = [
    { value: '', label: 'All environments' },
    { value: 'Production', label: 'Production' },
    { value: 'Staging', label: 'Staging' },
    { value: 'Development', label: 'Development' },
    { value: 'Preview', label: 'Preview' },
  ];

  const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Succeeded', label: 'Succeeded' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Running', label: 'Running' },
    { value: 'Pending', label: 'Pending' },
  ];

  const fieldLabelClass =
    'font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#9a9a9a] font-medium mb-1.5 block';

  const dropdownClass =
    'w-full flex items-center justify-between gap-2 h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] ' +
    'bg-white dark:bg-white/[0.03] text-gray-800 dark:text-[#e5e5e5] rounded-sm hover:border-[#2563eb] ' +
    'transition-colors';

  const dateInputClass =
    'w-full h-10 px-3 text-sm border border-gray-300 dark:border-[#525252] ' +
    'bg-white dark:bg-white/[0.03] text-gray-800 dark:text-[#e5e5e5] rounded-sm hover:border-[#2563eb] ' +
    'focus:border-[#2563eb] focus:outline-none transition-colors';

  const stats = report?.statistics;

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
        <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-7">
          <SectionTitle
            icon={<Icon name="observability" />}
            title="Deployment Reports"
            description="Query release history across projects and stages, inspect reliability trends, diagnose failures, and export audit data."
            actions={
              generated && report && report.items.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-xs font-medium border border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#d1d5e3] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-xs font-medium border border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#d1d5e3] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-sm text-xs font-medium border border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#d1d5e3] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              ) : undefined
            }
          />

          {/* ── Redesigned Structured Query Builder Card ────────────────────── */}
          <section
            aria-label="Report filters"
            className="rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02]"
          >
            {/* Card Header with Segmented Date Presets */}
            <div className="px-5 py-3.5 rounded-t-md border-b border-gray-200 dark:border-[#3d3d3d] bg-gray-50/70 dark:bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />
                <h2 className="text-[14.5px] font-medium text-gray-900 dark:text-white">
                  Report Query Builder
                </h2>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-sm bg-gray-200/70 dark:bg-white/10 text-gray-600 dark:text-[#c9c9c9]">
                  {activeFilters.length === 0
                    ? 'All scopes'
                    : `${activeFilters.length} ${activeFilters.length === 1 ? 'filter' : 'filters'}`}
                </span>
              </div>

              {/* Segmented Date Range Selector */}
              <div className="inline-flex items-center p-0.5 rounded-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-black/20 font-mono text-[11px]">
                {(
                  [
                    { id: '7d', label: '7D' },
                    { id: '30d', label: '30D' },
                    { id: '90d', label: '90D' },
                    { id: 'all', label: 'All Time' },
                  ] as const
                ).map((p) => {
                  const selected = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyDatePreset(p.id)}
                      className={`px-2.5 py-1 rounded-xs transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#2563eb] text-white font-medium'
                          : 'text-gray-600 dark:text-[#a1a1aa] hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Unified 5-Column Filter Grid */}
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <span className={fieldLabelClass}>Project</span>
                <FilterDropdown
                  value={projectId}
                  onChange={setProjectId}
                  options={projectOptions}
                  placeholder="All projects"
                  className={dropdownClass}
                  testId="report-project-filter"
                />
              </div>

              <div>
                <span className={fieldLabelClass}>Environment</span>
                <FilterDropdown
                  value={environment}
                  onChange={setEnvironment}
                  options={envOptions}
                  placeholder="All environments"
                  className={dropdownClass}
                  testId="report-environment-filter"
                />
              </div>

              <div>
                <span className={fieldLabelClass}>Status</span>
                <FilterDropdown
                  value={status}
                  onChange={setStatus}
                  options={statusOptions}
                  placeholder="All statuses"
                  className={dropdownClass}
                  testId="report-status-filter"
                />
              </div>

              <div>
                <label htmlFor="report-start-date" className={fieldLabelClass}>
                  From Date
                </label>
                <input
                  id="report-start-date"
                  data-testid="report-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={dateInputClass}
                />
              </div>

              <div>
                <label htmlFor="report-end-date" className={fieldLabelClass}>
                  To Date
                </label>
                <input
                  id="report-end-date"
                  data-testid="report-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setActivePreset('custom');
                  }}
                  className={dateInputClass}
                />
              </div>
            </div>

            {/* Validation Error */}
            {error && (
              <div className="px-5 pb-4">
                <div
                  role="alert"
                  data-testid="report-error"
                  className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-sm px-3.5 py-2.5 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Footer Action Bar + Active Filter Chips */}
            <div className="px-5 py-3.5 rounded-b-md border-t border-gray-200 dark:border-[#3d3d3d] bg-gray-50/50 dark:bg-white/[0.015] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 min-h-[28px]">
                {activeFilters.length === 0 ? (
                  <span className="text-xs text-gray-500 dark:text-[#8f8f8f]">
                    No active filters — report will include all accessible deployments.
                  </span>
                ) : (
                  activeFilters.map((chip) => (
                    <span
                      key={chip.key}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border border-[#2563eb]/30 bg-[#2563eb]/10 text-[#2563eb] dark:text-blue-300 font-mono text-[11.5px]"
                    >
                      <span>{chip.label}</span>
                      <button
                        type="button"
                        onClick={chip.onClear}
                        aria-label={`Remove ${chip.label}`}
                        className="hover:text-gray-900 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {(generated || activeFilters.length > 0) && (
                  <button
                    data-testid="reset-report-btn"
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm text-sm font-medium border border-gray-300 dark:border-[#525252] text-gray-600 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                )}

                <button
                  id="generate-report-btn"
                  data-testid="generate-report-btn"
                  type="button"
                  onClick={generateReport}
                  disabled={loading}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-sm text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileBarChart2 className="w-4 h-4" />
                  )}
                  {loading ? 'Generating…' : 'Generate Report'}
                </button>
              </div>
            </div>
          </section>

          {/* ── Quick Report Templates (shown before generating) ───────────── */}
          {!generated && !loading && (
            <section aria-label="Quick report templates" className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
                <Sparkles className="w-3.5 h-3.5 text-[#2563eb] dark:text-blue-400" />
                <span>Quick Report Presets</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => runQuickTemplate('prod30')}
                  className="group text-left p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] hover:border-[#2563eb] transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-sm bg-[#2563eb]/10 border border-[#2563eb]/25 flex items-center justify-center text-[#2563eb] dark:text-blue-400">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f]">30D • PROD</span>
                  </div>
                  <div>
                    <h3 className="text-[15.5px] font-medium text-gray-900 dark:text-white group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors">
                      Production Health Summary
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8f8f8f] mt-1 leading-relaxed">
                      Audit all production releases over the last 30 days with success rates and build durations.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => runQuickTemplate('failures')}
                  className="group text-left p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] hover:border-red-500 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-sm bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f]">INCIDENTS</span>
                  </div>
                  <div>
                    <h3 className="text-[15.5px] font-medium text-gray-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      Failed Deployments Audit
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8f8f8f] mt-1 leading-relaxed">
                      Isolate every failed release across all environments and surface failure diagnostics immediately.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => runQuickTemplate('all')}
                  className="group text-left p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] hover:border-emerald-500 transition-colors flex flex-col justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="w-9 h-9 rounded-sm bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                    <span className="font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f]">FULL AUDIT</span>
                  </div>
                  <div>
                    <h3 className="text-[15.5px] font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      Complete Workspace Report
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-[#8f8f8f] mt-1 leading-relaxed">
                      Run a full deployment report across every project, environment, and release status.
                    </p>
                  </div>
                </button>
              </div>
            </section>
          )}

          {/* ── Statistics cards ─────────────────────────────────────────────── */}
          {generated && stats && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              aria-label="Report statistics"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            >
              <StatCard
                label="Total Deployments"
                value={stats.totalDeployments}
                sub="Matched by filters"
                icon={<FileBarChart2 className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />}
                railColor="#2563eb"
                testId="stat-total"
              />
              <StatCard
                label="Successful"
                value={stats.successfulDeployments}
                sub="Completed cleanly"
                icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                accent="text-emerald-600 dark:text-emerald-400"
                railColor="#10b981"
                testId="stat-successful"
              />
              <StatCard
                label="Failed"
                value={stats.failedDeployments}
                sub={stats.failedDeployments > 0 ? 'Requires review' : 'Zero failures'}
                icon={<XCircle className="w-4 h-4 text-red-500" />}
                accent={stats.failedDeployments > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}
                railColor="#ef4444"
                testId="stat-failed"
              />
              <StatCard
                label="Success Rate"
                value={`${stats.successRate}%`}
                sub="Reliability score"
                icon={<TrendingUp className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />}
                accent={
                  stats.totalDeployments === 0
                    ? 'text-gray-400'
                    : stats.successRate >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : stats.successRate >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }
                railColor="#7928ca"
                testId="stat-success-rate"
              />
              <div className="col-span-2 sm:col-span-1">
                <StatCard
                  label="Avg. Duration"
                  value={stats.averageDurationSeconds != null ? formatDuration(stats.averageDurationSeconds) : '—'}
                  sub="Mean build & rollout"
                  icon={<Clock className="w-4 h-4 text-[#2563eb] dark:text-blue-400" />}
                  railColor="#3b82f6"
                  testId="stat-avg-duration"
                />
              </div>
            </motion.section>
          )}

          {/* ── Visual Insights & Charts ────────────────────────────────────── */}
          {generated && stats && report && report.items.length > 0 && (
            <ReportInsightsPanel stats={stats} items={report.items} />
          )}

          {/* ── Results table ────────────────────────────────────────────────── */}
          {generated && report && (
            <section aria-label="Report results" className="space-y-4">
              {report.items.length === 0 ? (
                <div
                  data-testid="report-empty"
                  className="py-14 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] text-center text-gray-500 dark:text-[#8f8f8f]"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-800 dark:text-[#d1d5e3]">
                      No deployments match the selected filters
                    </div>
                    <div className="text-xs">Try adjusting your filters or selecting a broader date range.</div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Table Search & Sort Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search commit, project, service, version, author…"
                        className="w-full h-9 pl-9 pr-3 text-sm border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.03] text-gray-800 dark:text-[#e5e5e5] rounded-sm focus:border-[#2563eb] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs">
                      <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                      <select
                        aria-label="Sort report rows"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="h-9 px-2.5 text-xs border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#1a1f2e] text-gray-700 dark:text-[#e0e0e0] rounded-sm focus:border-[#2563eb] focus:outline-none"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                        <option value="longest">Longest duration</option>
                        <option value="shortest">Shortest duration</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
                    {/* Table header */}
                    <div className="flex flex-row items-center gap-4 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        Deployment
                        <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                          {displayedItems.length}
                        </span>
                      </div>
                      <div className="w-[150px] shrink-0 hidden md:block">Project / Service</div>
                      <div className="w-[120px] shrink-0">Status</div>
                      <div className="w-[120px] shrink-0 hidden sm:block">Environment</div>
                      <div className="w-[90px] shrink-0 hidden lg:block text-right">Duration</div>
                      <div className="w-[120px] shrink-0 text-right">Started</div>
                    </div>

                    {/* Table rows */}
                    {displayedItems.map((item, index) => {
                      const mappedStatus = mapDeployStatus(item.status);
                      const isExpanded = expandedRowId === item.id;
                      const isLast = index === displayedItems.length - 1;

                      return (
                        <div
                          key={item.id}
                          className={!isLast ? 'border-b border-gray-300 dark:border-[#525252]' : ''}
                        >
                          <div
                            data-testid="report-row"
                            onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                            className="flex flex-row items-center gap-4 bg-transparent hover:bg-gray-50 dark:hover:bg-white/[0.03] px-4 h-[58px] cursor-pointer transition-colors"
                          >
                            {/* Deployment name + id */}
                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                              )}
                              <div className="min-w-0 flex flex-col justify-center">
                                <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-medium">
                                  {item.commitMessage || item.version || 'Manual Deploy'}
                                </span>
                                <span className="text-[12.5px] text-gray-500 dark:text-[#8f8f8f] font-mono mt-0.5 truncate hidden sm:block">
                                  {item.publicId ? item.publicId.replace('dep-', '').substring(0, 9) : item.id}
                                  {item.userName ? ` • ${item.userName}` : ''}
                                </span>
                              </div>
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
                            <div className="w-[90px] shrink-0 hidden lg:block text-right font-mono text-[13.5px] text-gray-600 dark:text-[#8f8f8f] tabular-nums">
                              {formatDuration(item.durationSeconds)}
                            </div>

                            {/* Started at */}
                            <div className="w-[120px] shrink-0 text-right font-mono text-[13px] text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                              {format(new Date(item.startedAt), 'MMM d, HH:mm')}
                            </div>
                          </div>

                          {/* Expandable Row Audit Details */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-gray-200 dark:border-[#333] bg-gray-50/80 dark:bg-white/[0.02] px-6 py-4"
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                                  <div>
                                    <span className="text-gray-500 dark:text-[#8f8f8f] block">Deployment ID</span>
                                    <span className="text-gray-900 dark:text-white mt-0.5 block break-all">
                                      {item.publicId || item.id}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-[#8f8f8f] block">Version / Commit</span>
                                    <span className="text-gray-900 dark:text-white mt-0.5 inline-flex items-center gap-1">
                                      <GitCommit className="w-3.5 h-3.5 text-gray-400" />
                                      {item.version}
                                      {item.commitSha ? ` (${item.commitSha.slice(0, 7)})` : ''}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-[#8f8f8f] block">Triggered By</span>
                                    <span className="text-gray-900 dark:text-white mt-0.5 block">
                                      {item.userName || '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-[#8f8f8f] block">Completed At</span>
                                    <span className="text-gray-900 dark:text-white mt-0.5 block">
                                      {item.completedAt ? format(new Date(item.completedAt), 'MMM d, yyyy HH:mm:ss') : 'In progress'}
                                    </span>
                                  </div>
                                </div>

                                {item.failureReason && (
                                  <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-400 font-mono">
                                    Failure Reason: {item.failureReason}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}
