import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  archiveProject,
} from './projectService';

/**
 * The API base comes from VITE_API_BASE_URL (or the localhost fallback), which differs
 * per environment. Tests assert on the path so they hold in any configuration.
 */
const API_PATH = '/api/projects';

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

/** Returns the [url, init] pair the code under test passed to fetch. */
function lastCall(): [string, RequestInit] {
  return (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
}

/** The path portion of the URL passed to fetch, ignoring the configured base URL. */
function lastPath(): string {
  const [url] = lastCall();
  return new URL(url).pathname;
}

describe('projectService', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
    localStorage.clear();
  });

  describe('authHeaders behaviour', () => {
    it('sends a bearer token when one is stored', async () => {
      localStorage.setItem('harbor_token', 'test-token');
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getProjects();

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    });

    it('omits the Authorization header when no token is stored', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getProjects();

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    });

    it('always sends the ngrok skip-browser-warning header', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: [] }));

      await getProjects();

      const [, init] = lastCall();
      expect((init.headers as Record<string, string>)['ngrok-skip-browser-warning']).toBe('true');
    });
  });

  describe('getProjects', () => {
    it('requests the projects collection and returns the data array', async () => {
      const projects = [{ id: 1, name: 'harbor-api', ownerId: 7, createdAt: '', isArchived: false }];
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: projects }));

      const result = await getProjects();

      expect(result).toEqual(projects);
      expect(lastPath()).toBe(API_PATH);
    });

    it('throws the detail message from the error response', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission.' }, false, 403),
      );

      await expect(getProjects()).rejects.toThrow('You do not have permission.');
    });

    it('falls back to the title when detail is absent', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ title: 'Forbidden' }, false, 403));

      await expect(getProjects()).rejects.toThrow('Forbidden');
    });

    it('falls back to a default message when the body has neither detail nor title', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(getProjects()).rejects.toThrow('Unable to load projects.');
    });

    it('falls back to the default message when the body is not valid JSON', async () => {
      (globalThis.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new SyntaxError('bad json')),
      });

      await expect(getProjects()).rejects.toThrow('Unable to load projects.');
    });
  });

  describe('getProject', () => {
    it('returns the project from a successful response', async () => {
      const project = { id: 5, name: 'harbor-web', ownerId: 7, createdAt: '', isArchived: false };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: project }));

      const result = await getProject('prj-abc');

      expect(result).toEqual(project);
      expect(lastPath()).toBe(`${API_PATH}/prj-abc`);
    });

    it('falls back to scanning the project list when the direct fetch fails', async () => {
      const project = { id: 5, publicId: 'prj-abc', name: 'harbor-web', ownerId: 7, createdAt: '', isArchived: false };

      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404)) // direct fetch fails
        .mockResolvedValueOnce(jsonResponse({ data: [project] })); // list fetch succeeds

      const result = await getProject('prj-abc');

      expect(result).toEqual(project);
    });

    it('matches a project by numeric id string in the fallback path', async () => {
      const project = { id: 5, name: 'harbor-web', ownerId: 7, createdAt: '', isArchived: false };

      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ data: [project] }));

      const result = await getProject('5');

      expect(result).toEqual(project);
    });

    it('returns undefined when neither the direct fetch nor the list matches', async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}, false, 404))
        .mockResolvedValueOnce(jsonResponse({ data: [] }));

      const result = await getProject('prj-missing');

      expect(result).toBeUndefined();
    });

    it('returns undefined when a successful response has no data', async () => {
      (globalThis.fetch as any)
        .mockResolvedValueOnce(jsonResponse({}))
        .mockResolvedValueOnce(jsonResponse({ data: [] }));

      expect(await getProject('prj-missing')).toBeUndefined();
    });
  });

  describe('createProject', () => {
    it('posts the payload and returns the created project', async () => {
      const project = { id: 9, name: 'new-project', ownerId: 7, createdAt: '', isArchived: false };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: project }, true, 201));

      const result = await createProject({ name: 'new-project', description: 'desc' });

      expect(result).toEqual(project);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(API_PATH);
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body as string)).toEqual({ name: 'new-project', description: 'desc' });
    });

    it('throws the detail message when creation is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'A project with that name already exists.' }, false, 400),
      );

      await expect(createProject({ name: 'dupe' })).rejects.toThrow(
        'A project with that name already exists.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(createProject({ name: 'x' })).rejects.toThrow('Unable to create project.');
    });
  });

  describe('updateProject', () => {
    it('puts the payload to the project endpoint', async () => {
      const project = { id: 9, name: 'renamed', ownerId: 7, createdAt: '', isArchived: false };
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: project }));

      const result = await updateProject('prj-abc', { name: 'renamed' });

      expect(result).toEqual(project);
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc`);
      expect(init.method).toBe('PUT');
    });

    it('throws the detail message when the update is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to update this project.' }, false, 400),
      );

      await expect(updateProject('prj-abc', { name: 'x' })).rejects.toThrow(
        'You do not have permission to update this project.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(updateProject('prj-abc', { name: 'x' })).rejects.toThrow('Unable to update project.');
    });
  });

  describe('archiveProject', () => {
    it('posts to the archive endpoint and resolves with undefined', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({ data: null }));

      const result = await archiveProject('prj-abc');

      expect(result).toBeUndefined();
      const [url, init] = lastCall();
      expect(new URL(url).pathname).toBe(`${API_PATH}/prj-abc/archive`);
      expect(init.method).toBe('POST');
    });

    it('throws the detail message when archiving is rejected', async () => {
      (globalThis.fetch as any).mockResolvedValue(
        jsonResponse({ detail: 'You do not have permission to archive this project.' }, false, 400),
      );

      await expect(archiveProject('prj-abc')).rejects.toThrow(
        'You do not have permission to archive this project.',
      );
    });

    it('falls back to a default message when the error body is empty', async () => {
      (globalThis.fetch as any).mockResolvedValue(jsonResponse({}, false, 500));

      await expect(archiveProject('prj-abc')).rejects.toThrow('Unable to archive project.');
    });
  });
});
