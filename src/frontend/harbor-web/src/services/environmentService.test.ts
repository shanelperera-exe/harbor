import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEnvironments,
  createEnvironment,
  updateEnvironment,
  removeEnvironment,
  getEnvironmentConfiguration,
  saveEnvironmentConfiguration,
} from './environmentService';

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

describe('environmentService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  describe('authHeaders behaviour', () => {
    it('sends a bearer token when one is stored', async () => {
      localStorage.setItem('harbor_token', 'test-token');
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getEnvironments('prj-abc');

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getEnvironments('prj-abc');

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });
  });

  describe('getEnvironments', () => {
    it('requests the environment collection and returns the data array', async () => {
      const environments = [{ id: 1, projectId: 10, name: 'production', type: 'Production', isActive: true, createdAt: '' }];
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: environments }));

      const result = await getEnvironments('prj-abc');

      expect(result).toEqual(environments);
      expect(lastPath()).toBe(`${API_PATH}/prj-abc/environments`);
    });

    it('disables caching for the environment list', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getEnvironments('prj-abc');

      const [, init] = lastCall();
      expect(init.cache).toBe('no-store');
    });

    it('throws the detail message when environments cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Project not found' }, false, 404));

      await expect(getEnvironments('prj-missing')).rejects.toThrow('Project not found');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getEnvironments('prj-abc')).rejects.toThrow('Unable to load environments.');
    });
  });

  describe('createEnvironment', () => {
    it('posts the payload and returns the created environment', async () => {
      const environment = { id: 2, projectId: 10, name: 'staging', type: 'Staging', isActive: true, createdAt: '' };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: environment }, true, 201));

      const result = await createEnvironment('prj-abc', { name: 'staging', type: 'Staging' });

      expect(result).toEqual(environment);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc/environments`);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ name: 'staging', type: 'Staging' });
    });

    it('throws the detail message when creation is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'An environment with that name already exists.' }, false, 400),
      );

      await expect(createEnvironment('prj-abc', { name: 'staging', type: 'Staging' })).rejects.toThrow(
        'An environment with that name already exists.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(createEnvironment('prj-abc', { name: 'x', type: 'Staging' })).rejects.toThrow(
        'Unable to create environment.',
      );
    });
  });

  describe('updateEnvironment', () => {
    it('puts the payload to the environment endpoint', async () => {
      const environment = { id: 2, projectId: 10, name: 'production', type: 'Production', isActive: true, createdAt: '' };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: environment }));

      const result = await updateEnvironment('prj-abc', 2, { name: 'production', type: 'Production' });

      expect(result).toEqual(environment);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc/environments/2`);
      expect(init.method).toBe('PUT');
    });

    it('throws the detail message when the update is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to update this environment.' }, false, 400),
      );

      await expect(updateEnvironment('prj-abc', 2, { name: 'x', type: 'Staging' })).rejects.toThrow(
        'You do not have permission to update this environment.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(updateEnvironment('prj-abc', 2, { name: 'x', type: 'Staging' })).rejects.toThrow(
        'Unable to update environment.',
      );
    });
  });

  describe('removeEnvironment', () => {
    it('deletes the environment and returns the removal result', async () => {
      const result = { deactivated: true, message: 'Environment deactivated.' };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: result }));

      const response = await removeEnvironment('prj-abc', 2);

      expect(response).toEqual(result);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc/environments/2`);
      expect(init.method).toBe('DELETE');
    });

    it('throws the detail message when removal is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to remove this environment.' }, false, 400),
      );

      await expect(removeEnvironment('prj-abc', 2)).rejects.toThrow(
        'You do not have permission to remove this environment.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(removeEnvironment('prj-abc', 2)).rejects.toThrow('Unable to remove environment.');
    });
  });

  describe('getEnvironmentConfiguration', () => {
    it('requests the configuration endpoint and returns it', async () => {
      const config = {
        environmentId: 2,
        configuration: [{ key: 'LOG_LEVEL', value: 'info' }],
        secureValues: [{ key: 'DB_PASSWORD', isSet: true }],
      };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: config }));

      const result = await getEnvironmentConfiguration('prj-abc', 2);

      expect(result).toEqual(config);
      expect(lastPath()).toBe(`${API_PATH}/prj-abc/environments/2/configuration`);
    });

    it('never expects raw secret values back from the API', async () => {
      // Secure values are reported as isSet flags only, never plaintext.
      const config = { environmentId: 2, configuration: [], secureValues: [{ key: 'DB_PASSWORD', isSet: true }] };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: config }));

      const result = await getEnvironmentConfiguration('prj-abc', 2);

      expect(result.secureValues[0]).toEqual({ key: 'DB_PASSWORD', isSet: true });
      expect(result.secureValues[0]).not.toHaveProperty('value');
    });

    it('throws the detail message when configuration cannot be loaded', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ detail: 'Environment not found' }, false, 404));

      await expect(getEnvironmentConfiguration('prj-abc', 999)).rejects.toThrow('Environment not found');
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getEnvironmentConfiguration('prj-abc', 2)).rejects.toThrow(
        'Unable to load environment configuration.',
      );
    });
  });

  describe('saveEnvironmentConfiguration', () => {
    const payload = {
      deploymentUrl: 'https://acme.dev',
      provider: 'docker',
      configuration: [{ key: 'LOG_LEVEL', value: 'debug' }],
      secureValues: [{ key: 'DB_PASSWORD', value: 'new-secret' }],
    };

    it('puts the configuration payload and returns the saved configuration', async () => {
      const saved = { environmentId: 2, configuration: [{ key: 'LOG_LEVEL', value: 'debug' }], secureValues: [] };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: saved }));

      const result = await saveEnvironmentConfiguration('prj-abc', 2, payload);

      expect(result).toEqual(saved);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc/environments/2/configuration`);
      expect(init.method).toBe('PUT');
      expect(JSON.parse(init.body as string)).toEqual(payload);
    });

    it('sends an empty secure value through so the stored secret is left unchanged', async () => {
      // A blank value means "keep the existing secret", so it must still be transmitted.
      const saved = { environmentId: 2, configuration: [], secureValues: [{ key: 'DB_PASSWORD', isSet: true }] };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: saved }));

      await saveEnvironmentConfiguration('prj-abc', 2, {
        ...payload,
        secureValues: [{ key: 'DB_PASSWORD', value: '' }],
      });

      const [, init] = lastCall();
      expect(JSON.parse(init.body as string).secureValues).toEqual([
        { key: 'DB_PASSWORD', value: '' },
      ]);
    });

    it('throws the detail message when saving is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to configure this environment.' }, false, 400),
      );

      await expect(saveEnvironmentConfiguration('prj-abc', 2, payload)).rejects.toThrow(
        'You do not have permission to configure this environment.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(saveEnvironmentConfiguration('prj-abc', 2, payload)).rejects.toThrow(
        'Unable to save environment configuration.',
      );
    });
  });
});
