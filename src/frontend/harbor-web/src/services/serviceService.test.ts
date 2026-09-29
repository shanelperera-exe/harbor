import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getServices, getService } from './serviceService';

/**
 * The API base comes from VITE_API_BASE_URL (or the localhost fallback), which differs
 * per environment. Tests assert on paths so they hold in any configuration.
 */
const API_PATH = '/api/projects';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

function lastCall(): [string, RequestInit] {
  return (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
}

function lastPath(): string {
  return new URL(lastCall()[0]).pathname;
}

describe('serviceService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  describe('getServices', () => {
    it('requests the service collection and returns the data array', async () => {
      const services = [{ id: 13, projectId: 10, name: 'api', type: 'Backend', createdAt: '' }];
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: services }));

      const result = await getServices('prj-abc');

      expect(result).toEqual(services);
      expect(lastPath()).toBe(`${API_PATH}/prj-abc/services`);
    });

    it('sends a bearer token when one is stored', async () => {
      localStorage.setItem('harbor_token', 'test-token');
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getServices('prj-abc');

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getServices('prj-abc');

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('throws the detail message when services cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: "You do not have permission to view this project's services." }, false, 400),
      );

      await expect(getServices('prj-abc')).rejects.toThrow(
        "You do not have permission to view this project's services.",
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getServices('prj-abc')).rejects.toThrow('Unable to load services.');
    });
  });

  describe('getService', () => {
    it('returns the service from a successful response', async () => {
      const service = { id: 13, publicId: 'srv-abc', projectId: 10, name: 'api', type: 'Backend', createdAt: '' };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: service }));

      const result = await getService('prj-abc', 'srv-abc');

      expect(result).toEqual(service);
      expect(lastPath()).toBe(`${API_PATH}/prj-abc/services/srv-abc`);
    });

    it('falls back to scanning the service list when the direct fetch fails', async () => {
      const service = { id: 13, publicId: 'srv-abc', projectId: 10, name: 'api', type: 'Backend', createdAt: '' };

      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ data: [service] }));

      const result = await getService('prj-abc', 'srv-abc');

      expect(result).toEqual(service);
    });

    it('matches a service by numeric id string in the fallback path', async () => {
      const service = { id: 13, projectId: 10, name: 'api', type: 'Backend', createdAt: '' };

      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ data: [service] }));

      const result = await getService('prj-abc', '13');

      expect(result).toEqual(service);
    });

    it('returns undefined when neither the direct fetch nor the list matches', async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ data: [] }));

      expect(await getService('prj-abc', 'srv-missing')).toBeUndefined();
    });

    it('returns undefined when a successful response has no data', async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({ data: [] }));

      expect(await getService('prj-abc', 'srv-missing')).toBeUndefined();
    });
  });
});
