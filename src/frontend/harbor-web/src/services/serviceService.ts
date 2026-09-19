export interface Service {
  id: number;
  projectId: number;
  name: string;
  type: string;
  repositoryUrl?: string | null;
  repositoryName?: string | null;
  repositoryBranch?: string | null;
  createdAt: string;
}

const serviceApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/projects';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getServices(projectId: number): Promise<Service[]> {
  const response = await fetch(`${serviceApiBase}/${projectId}/services`, {
    method: 'GET',
    headers: authHeaders(),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to load services.');
  }

  return body.data as Service[];
}
