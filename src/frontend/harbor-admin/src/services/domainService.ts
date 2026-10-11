export interface PlatformDomain {
  id: string;
  domainName: string;
  projectName: string;
  projectId: number;
  serviceName: string;
  serviceId: number;
  environment: string;
  sslStatus: 'issued' | 'renewing' | 'pending_validation' | 'failed';
  dnsStatus: 'verified' | 'unverified' | 'cname_missing';
  cnameTarget: string;
  createdAt: string;
  lastChecked: string;
}

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchPlatformDomains(): Promise<PlatformDomain[]> {
  const res = await fetch(`${apiBase}/projects/admin/domains`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch domains: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}

export async function verifyDomainDns(domainId: string): Promise<PlatformDomain> {
  const res = await fetch(`${apiBase}/projects/admin/domains/${domainId}/verify`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to verify domain: ${res.status} ${errorText}`);
  }

  return await res.json();
}

export async function revokeDomain(domainId: string): Promise<boolean> {
  const res = await fetch(`${apiBase}/projects/admin/domains/${domainId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to revoke domain: ${res.status} ${errorText}`);
  }

  return true;
}
