import { type StatusType } from '../components/ui/StatusBadge';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface DashboardProject {
  id: number;
  publicId?: string;
  name: string;
  description?: string | null;
  repositoryUrl?: string | null;
  ownerId: number;
  createdAt: string;
  totalDeployments: number;
  latestStatus?: string | null;
  latestDeploymentTime?: string | null;
}

export interface DashboardDeployment {
  id: number;
  publicId?: string;
  hash?: string;
  serviceId: number;
  serviceName?: string | null;
  projectId: number;
  projectName?: string | null;
  environment: string;
  version: string;
  commitSha?: string | null;
  commitMessage?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  userName?: string | null;
}

export interface DashboardMetrics {
  totalProjects: number;
  totalDeployments: number;
  successfulDeployments: number;
  runningDeployments: number;
  failedDeployments: number;
}

export interface DashboardSummary {
  projects: DashboardProject[];
  recentDeployments: DashboardDeployment[];
  metrics: DashboardMetrics;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const primaryUrl = `${apiBase}/deployments/dashboard`;
  let response: Response;
  try {
    response = await fetch(primaryUrl, {
      method: 'GET',
      headers: authHeaders(),
    });
  } catch {
    response = await fetch(`${apiBase}/dashboard`, {
      method: 'GET',
      headers: authHeaders(),
    });
  }

  if (!response.ok && response.status === 404) {
    response = await fetch(`${apiBase}/dashboard`, {
      method: 'GET',
      headers: authHeaders(),
    });
  }

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to load dashboard data.');
  }

  return {
    projects: body.projects || [],
    recentDeployments: body.recentDeployments || [],
    metrics: body.metrics || {
      totalProjects: (body.projects || []).length,
      totalDeployments: (body.recentDeployments || []).length,
      successfulDeployments: 0,
      runningDeployments: 0,
      failedDeployments: 0,
    },
  };
}

export function mapDashboardDeployStatus(status: string): { type: StatusType; label: string } {
  const s = (status || '').toLowerCase();
  if (s === 'succeeded' || s === 'ready') return { type: 'ready', label: 'Success' };
  if (s === 'failed' || s === 'error') return { type: 'error', label: 'Failed' };
  if (s === 'running' || s === 'pending' || s === 'queued') return { type: 'running', label: 'Running' };
  return { type: 'stopped', label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown' };
}
