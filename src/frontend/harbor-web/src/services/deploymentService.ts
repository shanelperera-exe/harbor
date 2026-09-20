const deploymentApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/deployments';

export interface Deployment {
  id: number;
  publicId?: string;
  projectId?: number;
  serviceId?: number | string;
  environment: string;
  version: string;
  commitSha?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string | null;
}

export interface DeploymentLog {
  timestamp: string;
  level: string;
  message: string;
}

export interface DeploymentDetails extends Deployment {
  failureReason?: string | null;
  logs: DeploymentLog[];
}

export interface DeploymentHistory {
  items: Deployment[];
  page: number;
  pageSize: number;
  totalCount: number;
}

function headers(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.title || fallback);
  return body as T;
}

export async function getDeploymentHistory(filters: { projectId?: number | string; serviceId?: number | string; status?: string; page?: number } = {}): Promise<DeploymentHistory> {
  const query = new URLSearchParams({ page: String(filters.page ?? 1), pageSize: '20' });
  if (filters.serviceId) query.set('serviceId', String(filters.serviceId));
  if (filters.projectId) query.set('projectId', String(filters.projectId));
  if (filters.status) query.set('status', filters.status);
  return readResponse<DeploymentHistory>(await fetch(`${deploymentApiBase}?${query}`, { headers: headers() }), 'Unable to load deployment history.');
}

export async function getDeploymentDetails(id: number | string): Promise<DeploymentDetails> {
  return readResponse<DeploymentDetails>(await fetch(`${deploymentApiBase}/${id}`, { headers: headers() }), 'Unable to load deployment details.');
}

export interface CreateDeploymentRequest {
  serviceId: number | string;
  environment: string;
  version: string;
  commitSha?: string | null;
}

export async function createDeployment(request: CreateDeploymentRequest): Promise<Deployment> {
  return readResponse<Deployment>(await fetch(deploymentApiBase, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers() },
    body: JSON.stringify(request),
  }), 'Unable to create deployment.');
}
