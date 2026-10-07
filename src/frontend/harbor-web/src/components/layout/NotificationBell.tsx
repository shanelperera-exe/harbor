import { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import type { Notification } from '../../services/notificationService';

// ── Helper ────────────────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: number) => void;
}) {
  const navigate = useNavigate();
  const isSuccess = notification.type === 'success';

  function handleClick() {
    if (!notification.isRead) onRead(notification.id);
    navigate(`/deployments`);
  }

  return (
    <li
      id={`notification-item-${notification.id}`}
      data-testid={`notification-item-${notification.id}`}
      className={`flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#252525] ${
        !notification.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
    >
      {/* Status dot */}
      <span
        aria-hidden="true"
        className={`mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full ${
          isSuccess ? 'bg-emerald-500' : 'bg-red-500'
        }`}
      />

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium leading-snug truncate ${
          notification.isRead
            ? 'text-gray-600 dark:text-gray-400'
            : 'text-gray-900 dark:text-white'
        }`}>
          {notification.title}
        </p>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-snug">
          {notification.message}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {format(new Date(notification.createdAt), 'MMM d, HH:mm')}
        </p>
      </div>

      {!notification.isRead && (
        <span
          aria-label="Unread"
          className="flex-shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500"
        />
      )}
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, loading, markRead, markAllRead, refresh } =
    useNotifications();

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  async function togglePanel() {
    if (!open) await refresh();
    setOpen(v => !v);
  }

  const hasUnread = unreadCount > 0;

  return (
    <div ref={panelRef} className="inline-flex relative h-full items-center">
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        type="button"
        aria-label={`Notifications${hasUnread ? ` — ${unreadCount} unread` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={togglePanel}
        className={`relative text-[15px] font-medium transition-colors h-9 w-9 p-0 focus:outline-none flex items-center justify-center rounded-sm ${
          open
            ? 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white'
            : 'text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />

        {/* Badge */}
        {hasUnread && (
          <span
            id="notification-badge"
            data-testid="notification-badge"
            aria-hidden="true"
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-4 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications panel"
          id="notification-panel"
          data-testid="notification-panel"
          className="absolute right-0 top-full mt-1 z-[9999] w-[22rem] bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] rounded-sm shadow-lg overflow-hidden"
          style={{ animation: 'notifIn 0.1s ease-out' }}
        >
          <style>{`
            @keyframes notifIn {
              from { opacity: 0; transform: scale(0.97) translateY(-4px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-[#383838]">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
              {hasUnread && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-red-500 text-white leading-none">
                  {unreadCount}
                </span>
              )}
            </div>

            {hasUnread && (
              <button
                id="mark-all-read-btn"
                type="button"
                onClick={async () => { await markAllRead(); }}
                className="flex items-center gap-1 text-[12px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[26rem] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-[13px]">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div
                id="notifications-empty"
                data-testid="notifications-empty"
                className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400"
              >
                <Bell className="w-6 h-6 opacity-40" />
                <p className="text-[13px]">No notifications yet</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-[#2d2d2d]">
                {notifications.map(n => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={markRead}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-200 dark:border-[#383838] flex justify-end">
              <a
                href="/deployments"
                className="flex items-center gap-1 text-[12px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View all deployments <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
