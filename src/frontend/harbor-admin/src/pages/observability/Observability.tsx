import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  ListChecks,
  Network,
  RefreshCw,
  Rocket,
  Search,
  Settings2,
  Target,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  GRAFANA_DASHBOARDS,
  GRAFANA_URL,
  PROMETHEUS_LINKS,
  PROMETHEUS_URL,
  grafanaDashboardUrl,
  probeTool,
  prometheusUrl,
  type GrafanaDashboard,
  type ToolStatus,
} from '../../services/observabilityService';

const DASHBOARD_ICONS: Record<GrafanaDashboard['category'], React.ReactNode> = {
  overview: <Gauge className="w-4 h-4" />,
  deployments: <Rocket className="w-4 h-4" />,
  runtime: <Cpu className="w-4 h-4" />,
  traffic: <Network className="w-4 h-4" />,
  messaging: <Zap className="w-4 h-4" />,
};

const PROMETHEUS_ICONS: Record<string, React.ReactNode> = {
  targets: <Target className="w-4 h-4" />,
  alerts: <Bell className="w-4 h-4" />,
  rules: <ListChecks className="w-4 h-4" />,
  graph: <Search className="w-4 h-4" />,
};

/** External links always open in a new tab without leaking the admin window/referrer. */
const EXTERNAL_LINK_PROPS = { target: '_blank', rel: 'noopener noreferrer' } as const;

function StatusPill({ status }: { status: ToolStatus }) {
  const map: Record<ToolStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    checking: {
      label: 'CHECKING',
      cls: 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-gray-300 border-gray-200 dark:border-[#3c4043]',
      icon: <RefreshCw className="w-3 h-3 animate-spin" />,
    },
    reachable: {
      label: 'REACHABLE',
      cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    unreachable: {
      label: 'UNREACHABLE',
      cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
      icon: <XCircle className="w-3 h-3" />,
    },
    unconfigured: {
      label: 'NOT CONFIGURED',
      cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };
  const { label, cls, icon } = map[status];
  return (
    <span className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm border font-mono text-[10px] ${cls}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}

function ToolCard({
  id,
  name,
  tagline,
  icon,
  accent,
  baseUrl,
  status,
}: {
  id: string;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  accent: string;
  baseUrl: string | null;
  status: ToolStatus;
}) {
  return (
    <div className="group relative p-4 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124] overflow-hidden transition-colors hover:border-gray-400 dark:hover:border-[#5f6368]">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center bg-gray-100 dark:bg-[#2c2d30] text-gray-700 dark:text-[#e8eaed] shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-base font-medium text-gray-900 dark:text-white">{name}</div>
            <div className="text-xs text-gray-500 dark:text-[#9aa0a6] truncate">{tagline}</div>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <code className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] truncate">
          {baseUrl ?? `Set VITE_${id.toUpperCase()}_URL at build time`}
        </code>
        {baseUrl ? (
          <a
            id={`open-${id}`}
            href={baseUrl}
            {...EXTERNAL_LINK_PROPS}
            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-sm bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 shrink-0"
          >
            <span>Open {name}</span>
            <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        ) : (
          <span className="text-xs font-medium px-3 py-1.5 rounded-sm border border-gray-300 dark:border-[#3c4043] text-gray-400 cursor-not-allowed shrink-0">
            Unavailable
          </span>
        )}
      </div>
    </div>
  );
}

function LinkTile({
  id,
  href,
  icon,
  title,
  description,
  meta,
}: {
  id: string;
  href: string | null;
  icon: React.ReactNode;
  title: string;
  description: string;
  meta?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-blue-600 dark:text-blue-400 shrink-0">{icon}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{title}</span>
        </div>
        {href && (
          <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0" />
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-[#9aa0a6] mt-1.5 leading-relaxed">{description}</p>
      {meta && <div className="text-[10px] font-mono text-gray-400 dark:text-[#80868b] mt-2 truncate">{meta}</div>}
    </>
  );

  const cls =
    'group block p-3 border border-gray-300 dark:border-[#3c4043] rounded-sm bg-white dark:bg-[#202124] transition-all';

  if (!href) {
    return <div className={`${cls} opacity-50 cursor-not-allowed`}>{body}</div>;
  }

  return (
    <a
      id={id}
      href={href}
      {...EXTERNAL_LINK_PROPS}
      className={`${cls} hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-[#1f2a3d]/40 hover:-translate-y-px focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500`}
    >
      {body}
    </a>
  );
}

const initialStatus = (url: string | null): ToolStatus => (url ? 'checking' : 'unconfigured');

async function probeAll(): Promise<[ToolStatus, ToolStatus]> {
  return Promise.all([
    probeTool(GRAFANA_URL, '/api/health'),
    probeTool(PROMETHEUS_URL, '/-/healthy'),
  ]);
}

export default function Observability() {
  const [grafanaStatus, setGrafanaStatus] = useState<ToolStatus>(() => initialStatus(GRAFANA_URL));
  const [prometheusStatus, setPrometheusStatus] = useState<ToolStatus>(() => initialStatus(PROMETHEUS_URL));
  const [checking, setChecking] = useState(true);

  const applyResults = useCallback(([g, p]: [ToolStatus, ToolStatus]) => {
    setGrafanaStatus(g);
    setPrometheusStatus(p);
    setChecking(false);
  }, []);

  const recheck = () => {
    setChecking(true);
    setGrafanaStatus(initialStatus(GRAFANA_URL));
    setPrometheusStatus(initialStatus(PROMETHEUS_URL));
    void probeAll().then(applyResults);
  };

  useEffect(() => {
    let cancelled = false;
    void probeAll().then((results) => {
      if (!cancelled) applyResults(results);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResults]);

  const anyUnconfigured = !GRAFANA_URL || !PROMETHEUS_URL;

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Observability
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
              Grafana · Prometheus
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Jump into metrics dashboards, scrape targets and alerting for the Harbor platform.
          </p>
        </div>

        <button
          id="observability-recheck"
          type="button"
          onClick={recheck}
          disabled={checking}
          className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>Re-check Connectivity</span>
        </button>
      </div>

      {anyUnconfigured && (
        <div className="mt-6 p-3 border border-amber-200 dark:border-amber-800 rounded-sm bg-amber-50 dark:bg-amber-950/30 flex items-start space-x-2.5">
          <Settings2 className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            One or more tools are not configured for this build. Set{' '}
            <code className="font-mono">VITE_GRAFANA_URL</code> and{' '}
            <code className="font-mono">VITE_PROMETHEUS_URL</code> (https only) as build arguments for the admin UI.
          </div>
        </div>
      )}

      {/* Tool cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 my-6">
        <ToolCard
          id="grafana"
          name="Grafana"
          tagline="Pre-provisioned Harbor Observability dashboards"
          icon={<BarChart3 className="w-5 h-5" />}
          accent="bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-400"
          baseUrl={GRAFANA_URL}
          status={grafanaStatus}
        />
        <ToolCard
          id="prometheus"
          name="Prometheus"
          tagline="Metrics scraper · 15s interval · 13 alert rules"
          icon={<Flame className="w-5 h-5" />}
          accent="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500"
          baseUrl={PROMETHEUS_URL}
          status={prometheusStatus}
        />
      </div>

      {/* Grafana dashboards */}
      <section aria-labelledby="grafana-dashboards-heading" className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="grafana-dashboards-heading"
            className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider"
          >
            Grafana Dashboards
          </h2>
          <span className="text-[11px] font-mono text-gray-400 dark:text-[#80868b]">
            Folder: Harbor Observability
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {GRAFANA_DASHBOARDS.map((d) => (
            <LinkTile
              key={d.uid}
              id={`grafana-dashboard-${d.uid}`}
              href={grafanaDashboardUrl(d.uid)}
              icon={DASHBOARD_ICONS[d.category]}
              title={d.title}
              description={d.description}
              meta={`/d/${d.uid}`}
            />
          ))}
        </div>
      </section>

      {/* Prometheus links */}
      <section aria-labelledby="prometheus-links-heading">
        <div className="flex items-center justify-between mb-2">
          <h2
            id="prometheus-links-heading"
            className="text-[11px] font-mono text-gray-500 dark:text-[#9aa0a6] uppercase tracking-wider"
          >
            Prometheus
          </h2>
          <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-gray-400 dark:text-[#80868b]">
            <Activity className="w-3 h-3" />
            <span>Raw metrics &amp; alerting</span>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {PROMETHEUS_LINKS.map((l) => (
            <LinkTile
              key={l.id}
              id={`prometheus-link-${l.id}`}
              href={prometheusUrl(l.path)}
              icon={PROMETHEUS_ICONS[l.id]}
              title={l.label}
              description={l.description}
              meta={l.path}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
