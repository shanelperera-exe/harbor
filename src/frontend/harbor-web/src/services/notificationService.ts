const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface Notification {
  id: number;
  deploymentId: number;
  /** "success" | "failure" */
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  environment?: string | null;
  serviceName?: string | null;
  projectName?: string | null;
  version?: string | null;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('harbor_token');
  return {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Fetches the authenticated user's notifications and the current unread count. */
export async function getNotifications(limit = 20): Promise<NotificationListResponse> {
  const response = await fetch(`${apiBase}/notifications?limit=${limit}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.detail || body?.title || 'Failed to load notifications.');
  }

  const data = await response.json();
  return {
    notifications: data.notifications ?? [],
    unreadCount: data.unreadCount ?? 0,
  };
}

/** Marks a single notification as read. */
export async function markNotificationRead(id: number): Promise<void> {
  const response = await fetch(`${apiBase}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to mark notification as read.');
  }
}

/** Marks all unread notifications as read. */
export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch(`${apiBase}/notifications/read-all`, {
    method: 'PATCH',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read.');
  }
}
