const deploymentApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/deployments';

export interface Deployment {
  id: number;
  publicId?: string;
  serviceId?: number | string;
  environment: string;
  version: string;
  commitSha?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  workflowFile?: string | null;
  workflowRef?: string | null;
  workflowRunUrl?: string | null;
}

export interface DeploymentLog {
  timestamp: string;
  level: string;
  message: string;
}

export interface DeploymentDetails extends Deployment {
  failureReason?: string | null;
  triggerError?: string | null;
  workflowRunUrl?: string | null;
  logs: DeploymentLog[];
}

export interface DeploymentHistory {
  items: Deployment[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface CiRun {
  id: number;
  serviceId: number;
  workflowName: string;
  workflowFile: string;
  branch: string;
  commitSha?: string | null;
  conclusion?: string | null;
  status: string;
  githubRunId: number;
  githubRunUrl?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface CiRunHistory {
  items: CiRun[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/** Thrown when the CI gate blocks a deployment. The `message` contains the reason. */
export class CiGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CiGateError';
  }
}

export interface CreateDeploymentRequest {
  serviceId: string;
  environment: string;
  version: string;
  commitSha?: string | null;
  branch?: string | null;
  /** Pass true to bypass the CI gate check and deploy even when CI is failing. */
  overrideCiGate?: boolean;
}

function headers(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.title || fallback);
  return body as T;
}

export async function getDeploymentHistory(
  filters: { serviceId?: number | string; status?: string; page?: number } = {},
): Promise<DeploymentHistory> {
  const query = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: '20' });
  if (filters.serviceId) query.set('serviceId', String(filters.serviceId));
  if (filters.status) query.set('status', filters.status);
  return readResponse<DeploymentHistory>(
    await fetch(`${deploymentApiBase}?${query}`, { headers: headers() }),
    'Unable to load deployment history.',
  );
}

export async function getDeploymentDetails(id: number | string): Promise<DeploymentDetails> {
  return readResponse<DeploymentDetails>(
    await fetch(`${deploymentApiBase}/${id}`, { headers: headers() }),
    'Unable to load deployment details.',
  );
}

export async function createDeployment(request: CreateDeploymentRequest): Promise<Deployment> {
  const response = await fetch(deploymentApiBase, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => ({}));

  // 422 = CI gate blocked — throw CiGateError so caller can prompt "Deploy anyway?"
  if (response.status === 422 && body?.status === 'CiGate') {
    throw new CiGateError(body?.ciWarning || 'CI checks are failing on this branch.');
  }
  // 201 = Running / 502 = GitHub rejected but record created
  if (!response.ok && response.status !== 502) {
    throw new Error(body?.detail || body?.title || 'Unable to create deployment.');
  }
  return body as Deployment;
}

export async function redeployDeployment(deploymentId: number | string): Promise<Deployment> {
  const response = await fetch(`${deploymentApiBase}/${deploymentId}/redeploy`, {
    method: 'POST',
    headers: headers(),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 502) {
    throw new Error(body?.detail || body?.title || 'Unable to redeploy deployment.');
  }
  return body as Deployment;
}

export async function getCiRunHistory(
  serviceId: number | string,
  page = 1,
  pageSize = 20,
): Promise<CiRunHistory> {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  query.set('serviceId', String(serviceId));
  return readResponse<CiRunHistory>(
    await fetch(`${deploymentApiBase}/ci-runs?${query}`, { headers: headers() }),
    'Unable to load CI run history.',
  );
}
