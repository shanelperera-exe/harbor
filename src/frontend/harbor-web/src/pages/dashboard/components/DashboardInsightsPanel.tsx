import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format, subDays, startOfDay, isSameDay } from 'date-fns';
import { Activity, BarChart3, Layers, Clock, TrendingUp, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { DashboardDeployment, DashboardMetrics, DashboardProject } from '../../../services/dashboardService';

interface DashboardInsightsPanelProps {
  metrics: DashboardMetrics;
  recentDeployments: DashboardDeployment[];
  projects: DashboardProject[];
  onSelectProject: (project: DashboardProject) => void;
}

function formatDurationSeconds(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export default function DashboardInsightsPanel({
  metrics,
  recentDeployments,
  projects,
  onSelectProject,
}: DashboardInsightsPanelProps) {
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // 1. Success / Health Donut calculations
  const health = useMemo(() => {
    const total = Math.max(metrics.totalDeployments, 0);
    const completed = metrics.successfulDeployments + metrics.failedDeployments;
    const successRate = completed > 0 ? Math.round((metrics.successfulDeployments / completed) * 100) : total > 0 ? 100 : 0;
    const successPct = total > 0 ? (metrics.successfulDeployments / total) * 100 : 0;
    const runningPct = total > 0 ? (metrics.runningDeployments / total) * 100 : 0;
    const failedPct = total > 0 ? (metrics.failedDeployments / total) * 100 : 0;
    return { total, successRate, successPct, runningPct, failedPct };
  }, [metrics]);

  // 2. Average deployment duration from completed recent deployments
  const avgDurationSec = useMemo(() => {
    const durations = recentDeployments
      .filter((d) => d.startedAt && d.completedAt)
      .map((d) => (new Date(d.completedAt!).getTime() - new Date(d.startedAt).getTime()) / 1000)
      .filter((s) => s > 0 && s < 7200);
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [recentDeployments]);

  // 3. 7-day deployment activity histogram
  const dailyActivity = useMemo(() => {
    const today = startOfDay(new Date());
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      let succeeded = 0;
      let failed = 0;
      let running = 0;

      for (const dep of recentDeployments) {
        if (!dep.startedAt) continue;
        const dDate = new Date(dep.startedAt);
        if (isSameDay(dDate, date)) {
          const s = (dep.status || '').toLowerCase();
          if (s === 'succeeded' || s === 'ready') succeeded++;
          else if (s === 'failed' || s === 'error') failed++;
          else running++;
        }
      }
      return {
        label: format(date, 'EEE'),
        fullDate: format(date, 'MMM d'),
        succeeded,
        failed,
        running,
        total: succeeded + failed + running,
      };
    });
    const maxCount = Math.max(1, ...days.map((d) => d.total));
    return { days, maxCount };
  }, [recentDeployments]);

  // 4. Environment distribution
  const envBreakdown = useMemo(() => {
    const counts: Record<string, { label: string; count: number; color: string }> = {
      production: { label: 'Production', count: 0, color: '#2563eb' },
      staging: { label: 'Staging', count: 0, color: '#6c35f5' },
      preview: { label: 'Preview', count: 0, color: '#8b5cf6' },
      development: { label: 'Development', count: 0, color: '#10b981' },
    };

    for (const dep of recentDeployments) {
      const key = (dep.environment || '').toLowerCase();
      if (key in counts) {
        counts[key].count++;
      } else if (key.startsWith('dev')) {
        counts.development.count++;
      } else if (key) {
        counts[key] = { label: dep.environment, count: (counts[key]?.count || 0) + 1, color: '#64748b' };
      }
    }

    const list = Object.values(counts).filter((e) => e.count > 0 || e.label === 'Production' || e.label === 'Staging' || e.label === 'Development');
    const total = Math.max(1, recentDeployments.length);
    return { list: list.slice(0, 4), total };
  }, [recentDeployments]);

  // 5. Top projects by deployment count
  const topProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => b.totalDeployments - a.totalDeployments).slice(0, 3);
    const maxDeploys = Math.max(1, ...sorted.map((p) => p.totalDeployments));
    return { sorted, maxDeploys };
  }, [projects]);

  // SVG Donut geometry
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const successLen = (health.successPct / 100) * circumference;
  const runningLen = (health.runningPct / 100) * circumference;
  const failedLen = (health.failedPct / 100) * circumference;

  return (
    <section
      id="dashboard-insights"
      aria-label="Operational Insights and Charts"
      className="grid grid-cols-1 lg:grid-cols-3 gap-4"
    >
      {/* ── Card 1: Deployment Reliability Donut ──────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-5 rounded-md bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between gap-5"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
              Release Health
            </span>
            <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
              Deployment Success Rate
            </h3>
          </div>
          <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
            <Activity className="w-4 h-4" />
          </span>
        </div>

        <div className="flex items-center gap-6">
          {/* Animated SVG Donut */}
          <div className="relative w-[114px] h-[114px] shrink-0">
            <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90" role="img" aria-label={`Success rate ${health.successRate}%`}>
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-gray-200 dark:text-[#262b3d]"
                strokeWidth="10"
              />
              {health.successPct > 0 && (
                <motion.circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="10"
                  strokeDasharray={`${successLen} ${circumference}`}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              {health.runningPct > 0 && (
                <motion.circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="10"
                  strokeDasharray={`${runningLen} ${circumference}`}
                  strokeDashoffset={-successLen}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                />
              )}
              {health.failedPct > 0 && (
                <motion.circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="10"
                  strokeDasharray={`${failedLen} ${circumference}`}
                  strokeDashoffset={-(successLen + runningLen)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-[22px] font-medium tabular-nums text-gray-900 dark:text-white leading-none">
                {health.successRate}%
              </span>
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-gray-500 dark:text-[#8b92a9] mt-1">
                HEALTHY
              </span>
            </div>
          </div>

          {/* Breakdown Legend */}
          <div className="flex-1 flex flex-col gap-2.5 font-mono text-[12px]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-600 dark:text-[#b4bacd]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Succeeded
              </span>
              <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                {metrics.successfulDeployments}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-600 dark:text-[#b4bacd]">
                <Loader2 className={`w-3.5 h-3.5 text-[#2563eb] dark:text-[#3b82f6] ${metrics.runningDeployments > 0 ? 'animate-spin' : ''}`} />
                Active
              </span>
              <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                {metrics.runningDeployments}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-gray-600 dark:text-[#b4bacd]">
                <XCircle className="w-3.5 h-3.5 text-red-500" />
                Failed
              </span>
              <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                {metrics.failedDeployments}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-[#262b3d] flex items-center justify-between text-[11px] text-gray-500 dark:text-[#8b92a9]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Avg Duration
              </span>
              <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                {formatDurationSeconds(avgDurationSec)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Card 2: 7-Day Deployment Activity Chart ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="p-5 rounded-md bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between gap-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
              7-Day Velocity
            </span>
            <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
              Deployment Cadence
            </h3>
          </div>
          <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
            <BarChart3 className="w-4 h-4" />
          </span>
        </div>

        {/* Interactive Stacked Bar Chart */}
        <div className="flex flex-col gap-2">
          <div className="h-[112px] flex items-end justify-between gap-2 pt-4">
            {dailyActivity.days.map((day, idx) => {
              const totalPct = day.total > 0 ? Math.max(14, (day.total / dailyActivity.maxCount) * 100) : 6;
              const successShare = day.total > 0 ? (day.succeeded / day.total) * 100 : 0;
              const runningShare = day.total > 0 ? (day.running / day.total) * 100 : 0;
              const failedShare = day.total > 0 ? (day.failed / day.total) * 100 : 0;
              const isHovered = hoveredDayIndex === idx;

              return (
                <div
                  key={day.fullDate}
                  onMouseEnter={() => setHoveredDayIndex(idx)}
                  onMouseLeave={() => setHoveredDayIndex(null)}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 relative cursor-default"
                >
                  {isHovered && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-mono text-[10px] rounded-[2px] whitespace-nowrap z-20 pointer-events-none">
                      {day.fullDate}: {day.total}
                    </div>
                  )}
                  <div className="w-full flex-1 flex items-end justify-center">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${totalPct}%` }}
                      transition={{ duration: 0.55, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className={`w-full max-w-[28px] rounded-t-[2px] overflow-hidden flex flex-col justify-end transition-opacity ${
                        day.total === 0 ? 'bg-gray-200 dark:bg-[#262b3d]' : ''
                      } ${hoveredDayIndex !== null && !isHovered ? 'opacity-55' : 'opacity-100'}`}
                    >
                      {day.failed > 0 && (
                        <div style={{ height: `${failedShare}%` }} className="w-full bg-red-500 min-h-[3px]" />
                      )}
                      {day.running > 0 && (
                        <div style={{ height: `${runningShare}%` }} className="w-full bg-[#2563eb] min-h-[3px]" />
                      )}
                      {day.succeeded > 0 && (
                        <div style={{ height: `${successShare}%` }} className="w-full bg-[#10b981] min-h-[3px]" />
                      )}
                    </motion.div>
                  </div>
                  <span className="font-mono text-[10.5px] text-gray-500 dark:text-[#8b92a9]">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-[#262b3d] flex items-center justify-between font-mono text-[11px] text-gray-500 dark:text-[#8b92a9]">
            <span>Last 7 days ({dailyActivity.days.reduce((sum, d) => sum + d.total, 0)} runs)</span>
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-[#37cd8f]">
              <TrendingUp className="w-3 h-3" />
              Live telemetry
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Card 3: Environment Mix & Top Projects ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="p-5 rounded-md bg-white dark:bg-white/[0.02] border border-gray-300 dark:border-[#525252] flex flex-col justify-between gap-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
              Distribution
            </span>
            <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
              Environments &amp; Activity
            </h3>
          </div>
          <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
            <Layers className="w-4 h-4" />
          </span>
        </div>

        {/* Environment Bars */}
        <div className="flex flex-col gap-2.5">
          {envBreakdown.list.map((env, idx) => {
            const pct = recentDeployments.length > 0 ? Math.round((env.count / envBreakdown.total) * 100) : 0;
            return (
              <div key={env.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between font-mono text-[11.5px]">
                  <span className="text-gray-700 dark:text-[#d1d5e3]">{env.label}</span>
                  <span className="text-gray-500 dark:text-[#8b92a9] tabular-nums">
                    {env.count} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-[#24283a] rounded-[1px] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.65, delay: 0.1 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-[1px]"
                    style={{ backgroundColor: env.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Most Active Projects mini-strip */}
        {topProjects.sorted.length > 0 && (
          <div className="pt-2.5 border-t border-gray-200 dark:border-[#262b3d] flex items-center justify-between gap-2 font-mono text-[11px]">
            <span className="text-gray-500 dark:text-[#8b92a9] shrink-0">Most active:</span>
            <div className="flex items-center gap-1.5 overflow-hidden">
              {topProjects.sorted.slice(0, 2).map((proj) => (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => onSelectProject(proj)}
                  className="px-2 py-0.5 border border-gray-200 dark:border-[#2e3244] hover:border-[#2563eb] bg-gray-50 dark:bg-white/[0.03] text-gray-800 dark:text-gray-200 rounded-[2px] truncate max-w-[120px] cursor-pointer transition-colors"
                >
                  {proj.name} ({proj.totalDeployments})
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </section>
  );
}
