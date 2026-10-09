import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeploymentReport, formatDuration } from './reportService';

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

describe('reportService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  describe('formatDuration', () => {
    it('returns dash for null or undefined', () => {
      expect(formatDuration(null)).toBe('—');
      expect(formatDuration(undefined)).toBe('—');
    });

    it('formats seconds correctly', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(0)).toBe('0s');
    });

    it('formats exact minutes correctly', () => {
      expect(formatDuration(120)).toBe('2m');
    });

    it('formats minutes and seconds correctly', () => {
      expect(formatDuration(135)).toBe('2m 15s');
      expect(formatDuration(65)).toBe('1m 5s');
    });
  });

  describe('getDeploymentReport', () => {
    it('fetches report with empty query', async () => {
      const mockData = {
        appliedFilters: {},
        statistics: {
          totalDeployments: 0,
          successfulDeployments: 0,
          failedDeployments: 0,
          successRate: 0,
          averageDurationSeconds: null,
        },
        items: [],
      };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse(mockData));

      const result = await getDeploymentReport();
      expect(result).toEqual(mockData);

      const [url, init] = lastCall();
      expect(url).toContain('/deployments');
      expect(init.headers).toEqual(expect.objectContaining({
        'Content-Type': 'application/json',
      }));
    });

    it('attaches auth token when available in localStorage', async () => {
      localStorage.setItem('harbor_token', 'test-token-123');
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [] }));

      await getDeploymentReport();
      const [, init] = lastCall();
      expect((init.headers as any)['Authorization']).toBe('Bearer test-token-123');
    });

    it('appends query parameters when provided', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [] }));

      await getDeploymentReport({
        projectId: '1',
        environment: 'Production',
        status: 'Succeeded',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      const [url] = lastCall();
      const parsedUrl = new URL(url);
      expect(parsedUrl.searchParams.get('projectId')).toBe('1');
      expect(parsedUrl.searchParams.get('environment')).toBe('Production');
      expect(parsedUrl.searchParams.get('status')).toBe('Succeeded');
      expect(parsedUrl.searchParams.get('startDate')).toBe('2026-01-01');
      expect(parsedUrl.searchParams.get('endDate')).toBe('2026-01-31');
    });

    it('throws error when response is not ok', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'Start date must be on or before end date.' }, false, 400)
      );

      await expect(getDeploymentReport({ startDate: '2026-02-01', endDate: '2026-01-01' }))
        .rejects.toThrow('Start date must be on or before end date.');
    });
  });
});
