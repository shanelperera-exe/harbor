export interface AdminUser {
  id: number;
  publicId: string;
  username: string;
  email: string;
  role: 'Admin' | 'User';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  projectCount: number;
  avatarSvg?: string | null;
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

export async function fetchAllUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${apiBase}/auth/admin/users`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch users: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  if (Array.isArray(data)) return data;
  if (data.data && Array.isArray(data.data)) return data.data;
  if (data.users && Array.isArray(data.users)) return data.users;
  return [];
}

export async function updateUserRole(userId: number, role: 'Admin' | 'User'): Promise<boolean> {
  const res = await fetch(`${apiBase}/auth/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update role: ${res.status} ${err}`);
  }

  return true;
}

export async function toggleUserStatus(userId: number, currentStatus: 'active' | 'suspended'): Promise<boolean> {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  const res = await fetch(`${apiBase}/auth/admin/users/${userId}/status`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status: newStatus }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update status: ${res.status} ${err}`);
  }

  return true;
}
