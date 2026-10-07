import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notificationService';

describe('notificationService (US-21)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  // ── getNotifications ──────────────────────────────────────────────────────

  it('getNotifications — fetches and returns notifications with unread count', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');

    const mockResponse = {
      notifications: [
        {
          id: 1,
          deploymentId: 10,
          type: 'success',
          title: 'Deployment succeeded — api-service',
          message: 'Version 1.0.0 deployed successfully to production.',
          isRead: false,
          createdAt: '2026-10-07T12:00:00Z',
          environment: 'production',
          serviceName: 'api-service',
          projectName: 'My Project',
          version: '1.0.0',
        },
        {
          id: 2,
          deploymentId: 11,
          type: 'failure',
          title: 'Deployment failed — worker',
          message: 'Version 2.0.0 failed to deploy to staging. Reason: OOM',
          isRead: true,
          createdAt: '2026-10-07T11:00:00Z',
          environment: 'staging',
          serviceName: 'worker',
          projectName: 'My Project',
          version: '2.0.0',
        },
      ],
      unreadCount: 1,
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const result = await getNotifications();

    expect(result.notifications).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
    expect(result.notifications[0].type).toBe('success');
    expect(result.notifications[1].type).toBe('failure');
  });

  it('getNotifications — returns empty list and zero unread when server returns empty', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ notifications: [], unreadCount: 0 }),
    } as Response);

    const result = await getNotifications();

    expect(result.notifications).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });

  it('getNotifications — sends Authorization header when token exists', async () => {
    localStorage.setItem('harbor_token', 'my-secret-token');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ notifications: [], unreadCount: 0 }),
    } as Response);

    await getNotifications();

    const callArgs = fetchSpy.mock.calls[0];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-secret-token');
  });

  it('getNotifications — throws on HTTP error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized' }),
    } as Response);

    await expect(getNotifications()).rejects.toThrow('Unauthorized');
  });

  it('getNotifications — handles missing notifications key with empty array', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    const result = await getNotifications();

    expect(result.notifications).toEqual([]);
    expect(result.unreadCount).toBe(0);
  });

  // ── markNotificationRead ──────────────────────────────────────────────────

  it('markNotificationRead — sends PATCH request to correct URL', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    await markNotificationRead(42);

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/42/read'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('markNotificationRead — throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    await expect(markNotificationRead(999)).rejects.toThrow('Failed to mark notification as read.');
  });

  // ── markAllNotificationsRead ──────────────────────────────────────────────

  it('markAllNotificationsRead — sends PATCH request to read-all URL', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    await markAllNotificationsRead();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/read-all'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('markAllNotificationsRead — throws on HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(markAllNotificationsRead()).rejects.toThrow('Failed to mark all notifications as read.');
  });

  // ── No false notifications (Scenario 3) ──────────────────────────────────

  it('getNotifications — never shows notifications when server returns empty (no false notifications)', async () => {
    localStorage.setItem('harbor_token', 'test-jwt');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ notifications: [], unreadCount: 0 }),
    } as Response);

    const result = await getNotifications();

    // Scenario 3: no deployment events → must not display any notifications
    expect(result.notifications).toHaveLength(0);
    expect(result.unreadCount).toBe(0);
  });
});
