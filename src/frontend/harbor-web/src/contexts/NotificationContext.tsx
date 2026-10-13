import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../services/notificationService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  /** Refresh the notification list from the API. */
  refresh: () => Promise<void>;
  /** Mark a single notification as read (optimistic + server sync). */
  markRead: (id: number) => Promise<void>;
  /** Mark all notifications as read (optimistic + server sync). */
  markAllRead: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Polling interval in milliseconds (30 seconds). */
const POLL_INTERVAL_MS = 30_000;

// ── Provider ──────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    // Only fetch when the user has a valid session token.
    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const data = await getNotifications(20);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silently fail — notifications are supplementary; don't break the app.
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    refresh();

    pollRef.current = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: number) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await markNotificationRead(id);
    } catch {
      // Rollback on failure
      await refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsRead();
    } catch {
      await refresh();
    }
  }, [refresh]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
}
