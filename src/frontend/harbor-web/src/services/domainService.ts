const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface ServiceDomain {
  id: number;
  serviceId: number;
  domain: string;
  environment: string;
  isPrimary: boolean;
  isSystem: boolean;
  status: 'Active' | 'Pending' | 'Invalid' | string;
  dnsType: string;
  dnsHost: string;
  dnsTarget: string;
  createdAt: string;
  verifiedAt?: string | null;
}

export interface CreateDomainPayload {
  domain: string;
  environment?: string;
}

export async function getServiceDomains(projectId: string, serviceId: string): Promise<ServiceDomain[]> {
  const token = localStorage.getItem('harbor_token');
  const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}/domains`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch domains');
  }

  const json = await res.json();
  return json.data || [];
}

export async function addServiceDomain(
  projectId: string,
  serviceId: string,
  payload: CreateDomainPayload
): Promise<ServiceDomain> {
  const token = localStorage.getItem('harbor_token');
  const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}/domains`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || errorJson.detail || 'Failed to add domain');
  }

  const json = await res.json();
  return json.data;
}

export async function deleteServiceDomain(projectId: string, serviceId: string, domainId: number): Promise<void> {
  const token = localStorage.getItem('harbor_token');
  const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}/domains/${domainId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete domain');
  }
}

export async function verifyServiceDomain(
  projectId: string,
  serviceId: string,
  domainId: number
): Promise<{ verified: boolean; status: string }> {
  const token = localStorage.getItem('harbor_token');
  const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}/domains/${domainId}/verify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to verify domain');
  }

  const json = await res.json();
  return json.data;
}

export async function setPrimaryServiceDomain(
  projectId: string,
  serviceId: string,
  domainId: number
): Promise<void> {
  const token = localStorage.getItem('harbor_token');
  const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}/domains/${domainId}/primary`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to set domain as primary');
  }
}
