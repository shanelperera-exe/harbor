// Report service for US-22 – Dynamic Deployment Reports

const reportingApiBase =
  (import.meta.env.VITE_REPORTING_API_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    'http://localhost:5000/api') + '/reports';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DeploymentReportQuery {
  projectId?: string;
  environment?: string;
  status?: string;
  startDate?: string; // ISO date string  e.g. "2026-01-15"
  endDate?: string;   // ISO date string
}

export interface DeploymentReportItem {
  id: number;
  publicId: string;
  environment: string;
  version: string;
  commitSha?: string | null;
  commitMessage?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  failureReason?: string | null;
  projectName?: string | null;
  serviceName?: string | null;
  userName?: string | null;
  durationSeconds?: number | null;
}

export interface DeploymentReportStatistics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  /** 0–100, one decimal place */
  successRate: number;
  /** null when no completed deployments exist */
  averageDurationSeconds: number | null;
}

export interface DeploymentReportResponse {
  appliedFilters: DeploymentReportQuery;
  statistics: DeploymentReportStatistics;
  items: DeploymentReportItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function headers(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── API call ───────────────────────────────────────────────────────────────────

/**
 * Fetches a deployment report from the Reporting service.
 * All filter parameters are optional; omitting one means "no restriction".
 */
export async function getDeploymentReport(
  query: DeploymentReportQuery = {},
): Promise<DeploymentReportResponse> {
  const params = new URLSearchParams();
  if (query.projectId)   params.set('projectId',   query.projectId);
  if (query.environment) params.set('environment', query.environment);
  if (query.status)      params.set('status',      query.status);
  if (query.startDate)   params.set('startDate',   query.startDate);
  if (query.endDate)     params.set('endDate',     query.endDate);

  const url = `${reportingApiBase}/deployments${params.size ? '?' + params.toString() : ''}`;
  const response = await fetch(url, { headers: headers() });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to generate deployment report.');
  }
  return body as DeploymentReportResponse;
}

// ── Display helpers ────────────────────────────────────────────────────────────

/** Formats a duration in seconds into a human-readable string. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}
