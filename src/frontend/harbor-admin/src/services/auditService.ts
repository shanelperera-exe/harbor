export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  ipAddress: string;
  severity: 'info' | 'warning' | 'critical';
  details?: string;
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

export async function fetchAuditLogs(limit: number = 100): Promise<AuditLogEntry[]> {
  const res = await fetch(`${apiBase}/reporting/audit?limit=${limit}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch audit logs: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
}
