const projectApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/projects';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface ProjectIntegration {
  id: number;
  projectId: number;
  providerType: string;
  name: string;
  createdAt: string;
}

export interface CreateProjectIntegrationPayload {
  providerType: string;
  name: string;
  providerToken: string;
}

export async function getProjectIntegrations(projectId: string | number): Promise<ProjectIntegration[]> {
  const response = await fetch(`${projectApiBase}/${projectId}/integrations`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || body?.detail || body?.title || 'Unable to load integrations.');
  }

  return body as ProjectIntegration[];
}

export async function createProjectIntegration(projectId: string | number, payload: CreateProjectIntegrationPayload): Promise<ProjectIntegration> {
  const response = await fetch(`${projectApiBase}/${projectId}/integrations`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.error || body?.detail || body?.title || 'Unable to create integration.');
  }

  return body as ProjectIntegration;
}

export async function deleteProjectIntegration(projectId: string | number, integrationId: number): Promise<void> {
  const response = await fetch(`${projectApiBase}/${projectId}/integrations/${integrationId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || body?.detail || body?.title || 'Unable to delete integration.');
  }
}
