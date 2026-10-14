/**
 * Observability tooling configuration (Grafana + Prometheus).
 *
 * URLs are injected at build time via:
 *   VITE_GRAFANA_URL     e.g. https://grafana.harborapp.tech
 *   VITE_PROMETHEUS_URL  e.g. https://prometheus.harborapp.tech
 *
 * In local dev (`npm run dev`) they fall back to the docker-compose ports.
 * In production builds there is NO fallback: if a URL is missing or invalid the
 * tool is reported as "not configured" rather than linking somewhere unexpected.
 *
 * TODO(security): Grafana/Prometheus have their own auth. Links from this admin UI do
 * not grant access; protect both tools at the edge (e.g. ACA built-in auth / Entra ID)
 * and never expose Prometheus publicly without authentication.
 */

export type ToolStatus = 'checking' | 'reachable' | 'unreachable' | 'unconfigured';

export interface GrafanaDashboard {
  uid: string;
  title: string;
  description: string;
  category: 'overview' | 'deployments' | 'runtime' | 'traffic' | 'messaging';
}

export interface PrometheusLink {
  id: string;
  label: string;
  path: string;
  description: string;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Accepts only absolute https URLs (or http for loopback hosts) and strips any
 * trailing slash, query string or fragment. Returns null for anything else so a
 * malformed or `javascript:` value can never reach an href.
 */
export function sanitizeToolUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const isHttps = url.protocol === 'https:';
    const isLocalHttp = url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname);
    if (!isHttps && !isLocalHttp) return null;
    if (url.username || url.password) return null; // never embed credentials in links
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

function resolveToolUrl(envValue: string | undefined, devFallback: string): string | null {
  const configured = sanitizeToolUrl(envValue);
  if (configured) return configured;
  return import.meta.env.DEV ? devFallback : null;
}

export const GRAFANA_URL = resolveToolUrl(import.meta.env.VITE_GRAFANA_URL, 'http://localhost:3000');
export const PROMETHEUS_URL = resolveToolUrl(import.meta.env.VITE_PROMETHEUS_URL, 'http://localhost:9090');

/** Mirrors the provisioned dashboards in infrastructure/monitoring/grafana/dashboards. */
export const GRAFANA_DASHBOARDS: GrafanaDashboard[] = [
  {
    uid: 'harbor-system-overview',
    title: 'System Overview & Golden Signals',
    description: 'UP/DOWN status matrix, throughput, P95 latency, 5xx rate and resource saturation.',
    category: 'overview',
  },
  {
    uid: 'harbor-deployment-operations',
    title: 'Deployment Operations & Event Telemetry',
    description: 'Success rate, failures, in-flight deployments and P50/P90/P99 durations.',
    category: 'deployments',
  },
  {
    uid: 'harbor-runtime-infrastructure',
    title: '.NET Runtime & Infrastructure',
    description: 'CPU, working set, GC pauses, ThreadPool starvation and CLR exception rates.',
    category: 'runtime',
  },
  {
    uid: 'harbor-traffic-gateway',
    title: 'Edge Traffic & Ingress Networking',
    description: 'Gateway RPS, latency curves, status code mix and outbound dependency health.',
    category: 'traffic',
  },
  {
    uid: 'harbor-kafka-events',
    title: 'Kafka Event Bus & Messaging',
    description: 'Producer connectivity, event emission rates and deployment state transitions.',
    category: 'messaging',
  },
];

export const PROMETHEUS_LINKS: PrometheusLink[] = [
  { id: 'targets', label: 'Scrape Targets', path: '/targets', description: 'Per-service scrape health and last scrape errors.' },
  { id: 'alerts', label: 'Active Alerts', path: '/alerts', description: 'Firing and pending alerts from alert_rules.yml.' },
  { id: 'rules', label: 'Alert Rules', path: '/rules', description: 'All 13 rule definitions and their evaluation state.' },
  { id: 'graph', label: 'Query Explorer', path: '/graph', description: 'Run ad-hoc PromQL against live metrics.' },
];

export function grafanaDashboardUrl(uid: string): string | null {
  if (!GRAFANA_URL) return null;
  return `${GRAFANA_URL}/d/${encodeURIComponent(uid)}?orgId=1&refresh=30s`;
}

export function prometheusUrl(path: string): string | null {
  if (!PROMETHEUS_URL) return null;
  return `${PROMETHEUS_URL}${path}`;
}

/**
 * Best-effort reachability probe. Uses `no-cors` so it works without CORS headers on
 * Grafana/Prometheus: an opaque response means the host answered, a thrown error means
 * it is down, blocked (mixed content) or DNS failed. It does NOT verify auth.
 */
export async function probeTool(baseUrl: string | null, healthPath: string, timeoutMs = 5000): Promise<ToolStatus> {
  if (!baseUrl) return 'unconfigured';
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${baseUrl}${healthPath}`, {
      mode: 'no-cors',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    });
    return 'reachable';
  } catch {
    return 'unreachable';
  } finally {
    window.clearTimeout(timer);
  }
}
