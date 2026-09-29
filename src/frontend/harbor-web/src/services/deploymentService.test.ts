import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDeploymentHistory,
  getDeploymentDetails,
  createDeployment,
  redeployDeployment,
  getCiRunHistory,
  mapDeployStatus,
  CiGateError,
} from './deploymentService';

/**
 * The API base comes from VITE_API_BASE_URL (or the localhost fallback), which differs
 * per environment. Tests assert on paths so they hold in any configuration.
 */
const API_PATH = '/api/deployments';

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

function lastQuery(): URLSearchParams {
  return new URL(lastCall()[0]).searchParams;
}

describe('deploymentService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  describe('getDeploymentHistory', () => {
    it('defaults to page 1 and page size 20 when no filters are given', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, totalCount: 0 }));

      const result = await getDeploymentHistory();

      expect(result.totalCount).toBe(0);
      expect(lastPath()).toBe(API_PATH);
      expect(lastQuery().get('page')).toBe('1');
      expect(lastQuery().get('pageSize')).toBe('20');
    });

    it('includes all supplied filters as query parameters', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [], page: 2, pageSize: 10, totalCount: 0 }));

      await getDeploymentHistory({
        serviceId: 'srv-abc',
        projectId: 'prj-abc',
        environment: 'production',
        status: 'Failed',
        page: 2,
        pageSize: 10,
      });

      const query = lastQuery();
      expect(query.get('serviceId')).toBe('srv-abc');
      expect(query.get('projectId')).toBe('prj-abc');
      expect(query.get('environment')).toBe('production');
      expect(query.get('status')).toBe('Failed');
      expect(query.get('page')).toBe('2');
      expect(query.get('pageSize')).toBe('10');
    });

    it('omits filters that are not supplied', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, totalCount: 0 }));

      await getDeploymentHistory({ serviceId: 'srv-abc' });

      const query = lastQuery();
      expect(query.get('serviceId')).toBe('srv-abc');
      expect(query.has('projectId')).toBe(false);
      expect(query.has('environment')).toBe(false);
      expect(query.has('status')).toBe(false);
    });

    it('returns the history payload from the API', async () => {
      const deployment = { id: 1, environment: 'production', version: '1.0.0', status: 'Succeeded', startedAt: '' };
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ items: [deployment], page: 1, pageSize: 20, totalCount: 1 }),
      );

      const result = await getDeploymentHistory();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].version).toBe('1.0.0');
    });

    it('throws the detail message when history cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Unauthorized' }, false, 401));

      await expect(getDeploymentHistory()).rejects.toThrow('Unauthorized');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getDeploymentHistory()).rejects.toThrow('Unable to load deployment history.');
    });
  });

  describe('getDeploymentDetails', () => {
    it('requests the deployment by id', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ id: 1, logs: [] }));

      const result = await getDeploymentDetails('dep-abc');

      expect(result.id).toBe(1);
      expect(lastPath()).toBe(`${API_PATH}/dep-abc`);
    });

    it('throws the detail message when details cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Deployment not found' }, false, 404));

      await expect(getDeploymentDetails('dep-missing')).rejects.toThrow('Deployment not found');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getDeploymentDetails('dep-abc')).rejects.toThrow('Unable to load deployment details.');
    });
  });

  describe('createDeployment', () => {
    const request = { serviceId: 'srv-abc', environment: 'production', version: '1.0.0' };

    it('posts the request and returns the created deployment', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ id: 42, status: 'Running' }, true, 201));

      const result = await createDeployment(request);

      expect(result.id).toBe(42);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(API_PATH);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual(request);
    });

    it('throws CiGateError when a 422 CiGate response is returned', async () => {
      // 422 + status CiGate means the CI gate blocked the deploy; the caller uses this
      // to prompt "Deploy anyway?".
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ status: 'CiGate', ciWarning: '2 checks are failing' }, false, 422),
      );

      await expect(createDeployment(request)).rejects.toThrow(CiGateError);
      await expect(createDeployment(request)).rejects.toThrow('2 checks are failing');
    });

    it('uses a default CiGate message when ciWarning is absent', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ status: 'CiGate' }, false, 422));

      await expect(createDeployment(request)).rejects.toThrow('CI checks are failing on this branch.');
    });

    it('does not treat a 422 without CiGate status as a CI gate block', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Invalid request' }, false, 422));

      await expect(createDeployment(request)).rejects.toThrow('Invalid request');
    });

    it('returns the deployment body on a 502 instead of throwing', async () => {
      // 502 means GitHub rejected the workflow dispatch but the deployment record was
      // still created, so the UI needs the record to show the failure.
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ id: 43, status: 'Failed', failureReason: 'GitHub API timeout' }, false, 502),
      );

      const result = await createDeployment(request);

      expect(result.id).toBe(43);
      expect(result.status).toBe('Failed');
    });

    it('sends the bearer token when a session is stored', async () => {
      localStorage.setItem('harbor_token', 'test-token');
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ id: 42 }, true, 201));

      await createDeployment(request);

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    });

    it('throws the detail message for other failures', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to deploy this service.' }, false, 400),
      );

      await expect(createDeployment(request)).rejects.toThrow(
        'You do not have permission to deploy this service.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(createDeployment(request)).rejects.toThrow('Unable to create deployment.');
    });
  });

  describe('redeployDeployment', () => {
    it('posts to the redeploy endpoint and returns the new deployment', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ id: 50, status: 'Running' }, true, 201));

      const result = await redeployDeployment(42);

      expect(result.id).toBe(50);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/42/redeploy`);
      expect(init.method).toBe('POST');
    });

    it('returns the deployment body on a 502 instead of throwing', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ id: 51, status: 'Failed', failureReason: 'Dispatch rejected' }, false, 502),
      );

      const result = await redeployDeployment(42);

      expect(result.status).toBe('Failed');
    });

    it('throws the detail message when the source deployment is not found', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'Succeeded deployment not found.' }, false, 404),
      );

      await expect(redeployDeployment(999)).rejects.toThrow('Succeeded deployment not found.');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(redeployDeployment(42)).rejects.toThrow('Unable to redeploy deployment.');
    });
  });

  describe('getCiRunHistory', () => {
    it('requests the ci-runs endpoint with the service id and paging', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, totalCount: 0 }));

      const result = await getCiRunHistory('srv-abc', 2, 5);

      expect(result.totalCount).toBe(0);
      expect(lastPath()).toBe(`${API_PATH}/ci-runs`);
      const query = lastQuery();
      expect(query.get('serviceId')).toBe('srv-abc');
      expect(query.get('page')).toBe('2');
      expect(query.get('pageSize')).toBe('5');
    });

    it('defaults to page 1 and page size 20', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ items: [], page: 1, pageSize: 20, totalCount: 0 }));

      await getCiRunHistory('srv-abc');

      expect(lastQuery().get('page')).toBe('1');
      expect(lastQuery().get('pageSize')).toBe('20');
    });

    it('returns the CI run items', async () => {
      const ciRun = { id: 1, serviceId: 13, status: 'completed', conclusion: 'success' };
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ items: [ciRun], page: 1, pageSize: 20, totalCount: 1 }),
      );

      const result = await getCiRunHistory('srv-abc');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].conclusion).toBe('success');
    });

    it('throws the detail message when CI runs cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Unauthorized' }, false, 401));

      await expect(getCiRunHistory('srv-abc')).rejects.toThrow('Unauthorized');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getCiRunHistory('srv-abc')).rejects.toThrow('Unable to load CI run history.');
    });
  });

  describe('mapDeployStatus', () => {
    it('maps Succeeded and Ready to the ready badge', () => {
      expect(mapDeployStatus('Succeeded')).toEqual({ type: 'ready', label: 'Success' });
      expect(mapDeployStatus('ready')).toEqual({ type: 'ready', label: 'Success' });
      expect(mapDeployStatus('SUCCEEDED')).toEqual({ type: 'ready', label: 'Success' });
    });

    it('maps Failed and Error to the error badge', () => {
      expect(mapDeployStatus('Failed')).toEqual({ type: 'error', label: 'Failed' });
      expect(mapDeployStatus('error')).toEqual({ type: 'error', label: 'Failed' });
    });

    it('maps Running, Pending and Queued to the running badge', () => {
      expect(mapDeployStatus('Running')).toEqual({ type: 'running', label: 'Running' });
      expect(mapDeployStatus('pending')).toEqual({ type: 'running', label: 'Running' });
      expect(mapDeployStatus('Queued')).toEqual({ type: 'running', label: 'Running' });
    });

    it('falls back to a capitalised stopped badge for unknown statuses', () => {
      expect(mapDeployStatus('Cancelled')).toEqual({ type: 'stopped', label: 'Cancelled' });
      expect(mapDeployStatus('CiGate')).toEqual({ type: 'stopped', label: 'CiGate' });
    });

    it('is case-insensitive for known statuses', () => {
      expect(mapDeployStatus('rUnNiNg')).toEqual({ type: 'running', label: 'Running' });
      expect(mapDeployStatus('FaIlEd')).toEqual({ type: 'error', label: 'Failed' });
    });
  });
});
