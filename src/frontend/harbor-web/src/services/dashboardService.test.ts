import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummary, mapDashboardDeployStatus } from './dashboardService';

describe('dashboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('mapDashboardDeployStatus correctly maps succeeded, running, and failed states', () => {
    expect(mapDashboardDeployStatus('Succeeded')).toEqual({ type: 'ready', label: 'Success' });
    expect(mapDashboardDeployStatus('ready')).toEqual({ type: 'ready', label: 'Success' });
    expect(mapDashboardDeployStatus('Running')).toEqual({ type: 'running', label: 'Running' });
    expect(mapDashboardDeployStatus('pending')).toEqual({ type: 'running', label: 'Running' });
    expect(mapDashboardDeployStatus('Failed')).toEqual({ type: 'error', label: 'Failed' });
    expect(mapDashboardDeployStatus('error')).toEqual({ type: 'error', label: 'Failed' });
    expect(mapDashboardDeployStatus('custom')).toEqual({ type: 'stopped', label: 'Custom' });
  });

  it('getDashboardSummary fetches from endpoint and parses response', async () => {
    localStorage.setItem('harbor_token', 'fake-jwt-token');

    const mockSummary = {
      projects: [{ id: 1, name: 'Project 1', totalDeployments: 2, ownerId: 10, createdAt: '2026-10-01' }],
      recentDeployments: [{ id: 101, environment: 'production', version: '1.0.0', status: 'Succeeded', startedAt: '2026-10-01', serviceId: 1, projectId: 1 }],
      metrics: { totalProjects: 1, totalDeployments: 1, successfulDeployments: 1, runningDeployments: 0, failedDeployments: 0 }
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockSummary,
    } as Response);

    const result = await getDashboardSummary();
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe('Project 1');
    expect(result.recentDeployments).toHaveLength(1);
    expect(result.metrics.successfulDeployments).toBe(1);
  });

  it('getDashboardSummary throws error on HTTP error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: 'Unauthorized access' }),
    } as Response);

    await expect(getDashboardSummary()).rejects.toThrow('Unauthorized access');
  });
});
