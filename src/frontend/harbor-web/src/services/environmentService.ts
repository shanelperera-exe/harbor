const environmentApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/projects';

export type EnvironmentType = 'Development' | 'Staging' | 'Production';

export interface DeploymentEnvironment {
  id: number;
  projectId: number;
  name: string;
  type: EnvironmentType;
  createdAt: string;
  isActive: boolean;
  deactivatedAt?: string;
  deploymentUrl?: string;
  provider?: string;
}

export interface ConfigurationItem {
  key: string;
  value: string;
}

export interface SecureValueEntry {
  key: string;
  isSet: boolean;
}

export interface SecureValueInput {
  key: string;
  /** Omit or leave blank to keep the previously stored secret unchanged. */
  value?: string;
}

export interface EnvironmentConfiguration {
  environmentId: number;
  deploymentUrl?: string;
  provider?: string;
  configuration: ConfigurationItem[];
  secureValues: SecureValueEntry[];
}

export interface ConfigureEnvironmentPayload {
  deploymentUrl: string;
  provider: string;
  configuration: ConfigurationItem[];
  secureValues: SecureValueInput[];
}

function headers(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.detail || body?.title || fallback);
  return body.data as T;
}

export function getEnvironments(projectId: number): Promise<DeploymentEnvironment[]> {
  return fetch(`${environmentApiBase}/${projectId}/environments`, { headers: headers(), cache: 'no-store' })
    .then(response => parse<DeploymentEnvironment[]>(response, 'Unable to load environments.'));
}

export function createEnvironment(projectId: number, payload: { name: string; type: EnvironmentType }): Promise<DeploymentEnvironment> {
  return fetch(`${environmentApiBase}/${projectId}/environments`, {
    method: 'POST', headers: headers(), body: JSON.stringify(payload),
  }).then(response => parse<DeploymentEnvironment>(response, 'Unable to create environment.'));
}

export function updateEnvironment(projectId: number, environmentId: number, payload: { name: string; type: EnvironmentType }): Promise<DeploymentEnvironment> {
  return fetch(`${environmentApiBase}/${projectId}/environments/${environmentId}`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(payload),
  }).then(response => parse<DeploymentEnvironment>(response, 'Unable to update environment.'));
}

export function removeEnvironment(projectId: number, environmentId: number): Promise<{ deactivated: boolean; message: string }> {
  return fetch(`${environmentApiBase}/${projectId}/environments/${environmentId}`, { method: 'DELETE', headers: headers() })
    .then(response => parse<{ deactivated: boolean; message: string }>(response, 'Unable to remove environment.'));
}

export function getEnvironmentConfiguration(projectId: number, environmentId: number): Promise<EnvironmentConfiguration> {
  return fetch(`${environmentApiBase}/${projectId}/environments/${environmentId}/configuration`, { headers: headers() })
    .then(response => parse<EnvironmentConfiguration>(response, 'Unable to load environment configuration.'));
}

export function saveEnvironmentConfiguration(
  projectId: number,
  environmentId: number,
  payload: ConfigureEnvironmentPayload,
): Promise<EnvironmentConfiguration> {
  return fetch(`${environmentApiBase}/${projectId}/environments/${environmentId}/configuration`, {
    method: 'PUT', headers: headers(), body: JSON.stringify(payload),
  }).then(response => parse<EnvironmentConfiguration>(response, 'Unable to save environment configuration.'));
}