import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  Activity,
  BarChart3,
  Layers,
  AlertTriangle,
  Zap,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  formatDuration,
  type DeploymentReportItem,
  type DeploymentReportStatistics,
} from '../../../services/reportService';

interface ReportInsightsPanelProps {
  stats: DeploymentReportStatistics;
  items: DeploymentReportItem[];
}

export default function ReportInsightsPanel({ stats, items }: ReportInsightsPanelProps) {
  const [hoveredBucket, setHoveredBucket] = useState<number | null>(null);

  // 1. Duration percentiles / min / max from real items
  const durationInsights = useMemo(() => {
    const vals = items
      .map((i) => i.durationSeconds)
      .filter((v): v is number => typeof v === 'number' && v >= 0)
      .sort((a, b) => a - b);

    if (vals.length === 0) return { fastest: null, median: null, slowest: null };
    const mid = Math.floor(vals.length / 2);
    const median = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
    return {
      fastest: vals[0],
      median,
      slowest: vals[vals.length - 1],
    };
  }, [items]);

  // 2. Chronological timeline buckets (grouped by calendar day, up to 12 most recent active days)
  const timeline = useMemo(() => {
    const map = new Map<string, { label: string; fullDate: string; succeeded: number; failed: number; other: number }>();
    const sorted = [...items].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    for (const item of sorted) {
      if (!item.startedAt) continue;
      const d = new Date(item.startedAt);
      const key = format(d, 'yyyy-MM-dd');
      const existing = map.get(key) ?? {
        label: format(d, 'MMM d'),
        fullDate: format(d, 'MMM d, yyyy'),
        succeeded: 0,
        failed: 0,
        other: 0,
      };
      const st = (item.status || '').toLowerCase();
      if (st === 'succeeded' || st === 'ready') existing.succeeded++;
      else if (st === 'failed' || st === 'error') existing.failed++;
      else existing.other++;
      map.set(key, existing);
    }

    const buckets = Array.from(map.values()).slice(-12);
    const maxTotal = Math.max(1, ...buckets.map((b) => b.succeeded + b.failed + b.other));
    return { buckets, maxTotal };
  }, [items]);

  // 3. Per-environment breakdown with individual success rates
  const envStats = useMemo(() => {
    const map = new Map<string, { env: string; total: number; succeeded: number; failed: number; color: string }>();
    const colorFor = (env: string) => {
      const e = env.toLowerCase();
      if (e === 'production') return '#0070f3';
      if (e === 'staging' || e === 'preview') return '#7928ca';
      if (e === 'development') return '#10b981';
      return '#64748b';
    };

    for (const item of items) {
      const env = item.environment || 'Production';
      const key = env.toLowerCase();
      const entry = map.get(key) ?? { env, total: 0, succeeded: 0, failed: 0, color: colorFor(env) };
      entry.total++;
      const st = (item.status || '').toLowerCase();
      if (st === 'succeeded' || st === 'ready') entry.succeeded++;
      else if (st === 'failed' || st === 'error') entry.failed++;
      map.set(key, entry);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  // 4. Recent failures for diagnostics callout
  const recentFailures = useMemo(() => {
    return items
      .filter((i) => {
        const s = (i.status || '').toLowerCase();
        return s === 'failed' || s === 'error';
      })
      .slice(0, 3);
  }, [items]);

  // Donut calculations
  const total = Math.max(stats.totalDeployments, 1);
  const otherCount = Math.max(0, stats.totalDeployments - stats.successfulDeployments - stats.failedDeployments);
  const successPct = (stats.successfulDeployments / total) * 100;
  const failedPct = (stats.failedDeployments / total) * 100;
  const otherPct = (otherCount / total) * 100;

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const successLen = (successPct / 100) * circumference;
  const otherLen = (otherPct / 100) * circumference;
  const failedLen = (failedPct / 100) * circumference;

  return (
    <section aria-label="Report visual insights" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Card 1: Outcome & Speed Insights Donut ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] flex flex-col justify-between gap-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
                Reliability &amp; Speed
              </span>
              <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
                Outcome Breakdown
              </h3>
            </div>
            <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative w-[112px] h-[112px] shrink-0">
              <svg viewBox="0 0 110 110" className="w-full h-full -rotate-90" role="img" aria-label={`Report success rate ${stats.successRate}%`}>
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className="text-gray-200 dark:text-[#333]"
                  strokeWidth="10"
                />
                {successPct > 0 && (
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
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                {otherPct > 0 && (
                  <motion.circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="10"
                    strokeDasharray={`${otherLen} ${circumference}`}
                    strokeDashoffset={-successLen}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                )}
                {failedPct > 0 && (
                  <motion.circle
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="10"
                    strokeDasharray={`${failedLen} ${circumference}`}
                    strokeDashoffset={-(successLen + otherLen)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[20px] font-medium tabular-nums text-gray-900 dark:text-white leading-none">
                  {stats.successRate}%
                </span>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f] mt-1">
                  PASS RATE
                </span>
              </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 font-mono text-[12px]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-[#c9c9c9]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Succeeded
                </span>
                <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                  {stats.successfulDeployments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-[#c9c9c9]">
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  Failed
                </span>
                <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                  {stats.failedDeployments}
                </span>
              </div>
              <div className="pt-2 mt-1 border-t border-gray-200 dark:border-[#333] grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500 dark:text-[#8f8f8f] flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-500" /> Fastest
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                    {formatDuration(durationInsights.fastest)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-[#8f8f8f] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#2563eb] dark:text-blue-400" /> Slowest
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium tabular-nums">
                    {formatDuration(durationInsights.slowest)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Card 2: Chronological Deployment Volume Chart ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
          className="p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
                Timeline Trend
              </span>
              <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
                Deployments Over Time
              </h3>
            </div>
            <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
              <BarChart3 className="w-4 h-4" />
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="h-[112px] flex items-end justify-between gap-1.5 pt-4">
              {timeline.buckets.map((b, idx) => {
                const count = b.succeeded + b.failed + b.other;
                const heightPct = Math.max(14, (count / timeline.maxTotal) * 100);
                const sPct = (b.succeeded / count) * 100;
                const fPct = (b.failed / count) * 100;
                const oPct = (b.other / count) * 100;
                const isHovered = hoveredBucket === idx;

                return (
                  <div
                    key={b.fullDate}
                    onMouseEnter={() => setHoveredBucket(idx)}
                    onMouseLeave={() => setHoveredBucket(null)}
                    className="flex-1 h-full flex flex-col items-center justify-end gap-1.5 relative cursor-default"
                  >
                    {isHovered && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-mono text-[10px] rounded-sm whitespace-nowrap z-20 pointer-events-none">
                        {b.label}: {count} ({b.succeeded} ok, {b.failed} fail)
                      </div>
                    )}
                    <div className="w-full flex-1 flex items-end justify-center">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                        className={`w-full max-w-[26px] rounded-t-sm overflow-hidden flex flex-col justify-end transition-opacity ${
                          hoveredBucket !== null && !isHovered ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        {b.failed > 0 && <div style={{ height: `${fPct}%` }} className="w-full bg-red-500 min-h-[3px]" />}
                        {b.other > 0 && <div style={{ height: `${oPct}%` }} className="w-full bg-[#2563eb] min-h-[3px]" />}
                        {b.succeeded > 0 && <div style={{ height: `${sPct}%` }} className="w-full bg-emerald-500 min-h-[3px]" />}
                      </motion.div>
                    </div>
                    <span className="font-mono text-[10px] text-gray-500 dark:text-[#8f8f8f] truncate max-w-full">
                      {b.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-[#333] flex items-center justify-between font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f]">
              <span>{timeline.buckets.length} active {timeline.buckets.length === 1 ? 'day' : 'days'}</span>
              <span>Median: {formatDuration(durationInsights.median)}</span>
            </div>
          </div>
        </motion.div>

        {/* ── Card 3: Environment Reliability Breakdown ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
          className="p-5 rounded-md border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] flex flex-col justify-between gap-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[11px] uppercase tracking-wider text-gray-500 dark:text-[#8f8f8f]">
                By Environment
              </span>
              <h3 className="text-[16px] font-medium text-gray-900 dark:text-white mt-0.5">
                Stage Breakdown
              </h3>
            </div>
            <span className="w-8 h-8 rounded-sm border border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-center text-[#2563eb] dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {envStats.slice(0, 4).map((row, idx) => {
              const sharePct = Math.round((row.total / total) * 100);
              const envRate = row.total > 0 ? Math.round((row.succeeded / row.total) * 100) : 0;
              return (
                <div key={row.env} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between font-mono text-[11.5px]">
                    <span className="text-gray-800 dark:text-[#e0e0e0] font-medium">{row.env}</span>
                    <span className="text-gray-500 dark:text-[#8f8f8f] tabular-nums">
                      {row.total} runs • {envRate}% ok
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-[#333] rounded-sm overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${sharePct}%` }}
                      transition={{ duration: 0.6, delay: 0.08 + idx * 0.05 }}
                      className="h-full rounded-sm"
                      style={{ backgroundColor: row.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-[#333] font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f] flex items-center justify-between">
            <span>{envStats.length} {envStats.length === 1 ? 'environment' : 'environments'}</span>
            <span>{items.length} matched records</span>
          </div>
        </motion.div>
      </div>

      {/* ── Failure Diagnostics Banner (only when failures exist) ─────────── */}
      {recentFailures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="p-4 rounded-md border border-red-300 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/20 flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Failure Diagnostics ({stats.failedDeployments} failed in this report)</span>
            </div>
            <span className="font-mono text-[11px] text-red-600/80 dark:text-red-400/80">
              Showing latest {recentFailures.length}
            </span>
          </div>
          <div className="divide-y divide-red-200/70 dark:divide-red-900/40">
            {recentFailures.map((f) => (
              <div key={f.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono px-1.5 py-0.5 rounded-sm bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 shrink-0">
                    {f.environment}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {f.projectName || 'Project'} / {f.serviceName || f.version}
                  </span>
                  <span className="text-red-700 dark:text-red-300 truncate">
                    — {f.failureReason || 'Deployment workflow failed'}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-gray-500 dark:text-[#8f8f8f] shrink-0">
                  {format(new Date(f.startedAt), 'MMM d, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </section>
  );
}
