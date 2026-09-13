import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { createEnvironment, getEnvironments, type DeploymentEnvironment, type EnvironmentType } from '../../services/environmentService';
import { getProject, type Project } from '../../services/projectService';

const types: EnvironmentType[] = ['Development', 'Staging', 'Production'];

export default function ProjectEnvironments() {
  const { id } = useParams();
  const projectId = Number(id);
  const [project, setProject] = useState<Project>();
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<EnvironmentType>('Development');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(projectId) || projectId < 1) { setError('Invalid project.'); setLoading(false); return; }
    Promise.all([getProject(projectId), getEnvironments(projectId)])
      .then(([loadedProject, loadedEnvironments]) => {
        if (!loadedProject) throw new Error('Project not found.');
        setProject(loadedProject); setEnvironments(loadedEnvironments);
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load environments.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null); setSaving(true);
    try {
      const created = await createEnvironment(projectId, { name, type });
      setEnvironments(current => [...current, created]); setName('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create environment.'); }
    finally { setSaving(false); }
  }

  return <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909]">
    <Link to="/projects" className="text-sm text-blue-600 dark:text-[#a585ff]">← Projects</Link>
    <h1 className="text-3xl font-semibold mt-3">{project ? `${project.name} environments` : 'Project environments'}</h1>
    <p className="text-gray-500 dark:text-gray-400 mt-2">Define the deployment targets for this project.</p>
    {error && <p className="text-red-500 mt-5" data-testid="environment-error">{error}</p>}
    {loading ? <p className="text-gray-500 mt-5">Loading environments...</p> : <>
      <form onSubmit={submit} className="mt-7 max-w-xl grid gap-4 border border-gray-200 dark:border-[#333] p-5" data-testid="create-environment-form">
        <label className="grid gap-1">Name
          <input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Development" className="border p-2 bg-transparent" />
        </label>
        <label className="grid gap-1">Environment type
          <select value={type} onChange={event => setType(event.target.value as EnvironmentType)} className="border p-2 bg-transparent">
            {types.map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <button disabled={saving} className="h-10 px-5 w-fit bg-black dark:bg-white text-white dark:text-black font-medium disabled:opacity-50">
          {saving ? 'Creating…' : 'Create environment'}
        </button>
      </form>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="environments-list">
        {environments.map(environment => <div key={environment.id} className="p-5 border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111]">
          <p className="text-lg font-medium">{environment.name}</p><p className="text-gray-500 dark:text-gray-400">{environment.type}</p>
        </div>)}
        {environments.length === 0 && <p className="text-gray-500">No environments configured yet.</p>}
      </div>
    </>}
  </div>;
}
