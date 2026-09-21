const projectApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/projects';

export interface Project {
  id: number;
  publicId?: string;
  name: string;
  description?: string | null;
  repositoryUrl?: string | null;
  ownerId: number;
  createdAt: string;
  isArchived: boolean;
  archivedAt?: string | null;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
}

export interface UpdateProjectPayload {
  name: string;
  description?: string;
  repositoryUrl?: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
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

export async function getProject(id: number | string): Promise<Project | undefined> {
  const response = await fetch(`${projectApiBase}/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (response.ok) {
    const body = await response.json().catch(() => ({}));
    if (body.data) return body.data as Project;
  }

  const projects = await getProjects();
  return projects.find((p) => p.publicId === id || p.id.toString() === id.toString());
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

export async function updateProject(id: number | string, payload: UpdateProjectPayload): Promise<Project> {
  const response = await fetch(`${projectApiBase}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body?.detail || body?.title || 'Unable to update project.');
  }

  return body.data as Project;
}

export async function archiveProject(id: number | string): Promise<void> {
  const response = await fetch(`${projectApiBase}/${id}/archive`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || body?.title || 'Unable to archive project.');
  }
}