const projectApiBase = import.meta.env.VITE_PROJECT_API_URL || 'http://localhost:5079/api/projects';

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  repositoryUrl?: string | null;
  ownerId: number;
  createdAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(projectApiBase, {
    method: 'GET',
    headers: authHeaders(),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to load projects.');
  }

  return body.data as Project[];
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  const response = await fetch(projectApiBase, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to create project.');
  }

  return body.data as Project;
}