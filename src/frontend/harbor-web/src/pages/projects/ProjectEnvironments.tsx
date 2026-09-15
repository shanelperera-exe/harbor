import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Globe, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  createEnvironment, getEnvironments, removeEnvironment, updateEnvironment,
  type DeploymentEnvironment, type EnvironmentType,
} from '../../services/environmentService';
import { getProject, type Project } from '../../services/projectService';
import EnvironmentTypeBadge from '../../components/ui/EnvironmentTypeBadge';

const types: EnvironmentType[] = ['Development', 'Staging', 'Production'];

export default function ProjectEnvironments() {
  const { id } = useParams();
  const projectId = Number(id);
  const [project, setProject] = useState<Project>();
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<EnvironmentType>('Development');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<EnvironmentType>('Development');

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
    event.preventDefault(); setError(null); setNotice(null); setSaving(true);
    try {
      const created = await createEnvironment(projectId, { name, type });
      setEnvironments(current => [...current, created]); setName('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to create environment.'); }
    finally { setSaving(false); }
  }

  function startEditing(environment: DeploymentEnvironment) {
    setEditing(environment.id); setEditName(environment.name); setEditType(environment.type); setError(null); setNotice(null);
  }

  async function saveEdit(environmentId: number) {
    setError(null); setNotice(null); setSaving(true);
    try {
      const updated = await updateEnvironment(projectId, environmentId, { name: editName, type: editType });
      setEnvironments(current => current.map(environment => environment.id === environmentId ? updated : environment));
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to update environment.'); }
    finally { setSaving(false); }
  }

  async function remove(environmentId: number) {
    if (!window.confirm('Remove this environment? Environments with deployment history will be deactivated.')) return;
    setError(null); setNotice(null); setSaving(true);
    try {
      const result = await removeEnvironment(projectId, environmentId);
      setEnvironments(current => current.filter(environment => environment.id !== environmentId));
      if (result.deactivated) setNotice(result.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to remove environment.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <Link to="/projects" className="text-[13px] text-blue-600 dark:text-[#a585ff]">← Projects</Link>
      <h1 className="text-3xl font-semibold mt-3">{project ? `${project.name} environments` : 'Project environments'}</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
        Define the deployment targets for this project, then configure each one with the details Harbor needs to deploy to it.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-5" data-testid="environment-error">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><p>{error}</p>
        </div>
      )}
      {notice && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-[#a585ff] mt-5" data-testid="environment-notice">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /><p>{notice}</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 mt-5">Loading environments...</p>
      ) : (
        <>
          <form onSubmit={submit} className="mt-7 max-w-xl grid gap-4 border border-gray-200 dark:border-[#333] p-5" data-testid="create-environment-form">
            <div className="flex items-center gap-2 text-[15px] font-medium">
              <Plus className="w-4 h-4" /> New environment
            </div>
            <label className="grid gap-1 text-[15px]">Name
              <input
                required maxLength={100} value={name} onChange={event => setName(event.target.value)}
                placeholder="e.g. Development"
                className="h-10 border border-black dark:border-[#6b6b6b] px-3 bg-transparent focus:outline-none focus:ring-1"
              />
            </label>
            <label className="grid gap-1 text-[15px]">Environment type
              <select
                value={type} onChange={event => setType(event.target.value as EnvironmentType)}
                className="h-10 border border-black dark:border-[#6b6b6b] px-3 bg-transparent focus:outline-none focus:ring-1"
              >
                {types.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button disabled={saving} className="h-10 px-5 w-fit flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black font-medium disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Creating…' : 'Create environment'}
            </button>
          </form>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="environments-list">
            {environments.map(environment => (
              <div key={environment.id} className="border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111111] flex flex-col">
                {editing === environment.id ? (
                  <div className="grid gap-3 p-5">
                    <input
                      required maxLength={100} value={editName} onChange={event => setEditName(event.target.value)}
                      className="h-10 border border-black dark:border-[#6b6b6b] px-3 bg-transparent focus:outline-none focus:ring-1"
                      aria-label="Environment name"
                    />
                    <select
                      value={editType} onChange={event => setEditType(event.target.value as EnvironmentType)}
                      className="h-10 border border-black dark:border-[#6b6b6b] px-3 bg-transparent focus:outline-none focus:ring-1"
                      aria-label="Environment type"
                    >
                      {types.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <div className="flex gap-4">
                      <button disabled={saving} onClick={() => saveEdit(environment.id)} className="flex items-center gap-1 text-[13px] text-blue-600 dark:text-[#a585ff] font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save
                      </button>
                      <button disabled={saving} onClick={() => setEditing(null)} className="flex items-center gap-1 text-[13px] text-gray-500">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-5 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-lg font-medium truncate" title={environment.name}>{environment.name}</p>
                        <EnvironmentTypeBadge type={environment.type} />
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-[13px] font-roobert text-gray-500 dark:text-gray-400 min-w-0">
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        {environment.deploymentUrl ? (
                          <span className="truncate" title={environment.deploymentUrl}>
                            {environment.deploymentUrl}{environment.provider ? ` · ${environment.provider}` : ''}
                          </span>
                        ) : (
                          <span className="italic">Not configured yet</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/projects/${projectId}/environments/${environment.id}/configure`}
                      className="flex items-center justify-between px-5 h-11 text-[13px] font-medium border-t border-gray-200 dark:border-[#333] text-blue-600 dark:text-[#a585ff] hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors"
                    >
                      Configure deployment <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex gap-4 px-5 py-3 border-t border-gray-200 dark:border-[#333]">
                      <button disabled={saving} onClick={() => startEditing(environment)} className="flex items-center gap-1 text-[13px] text-gray-600 dark:text-gray-300">
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button disabled={saving} onClick={() => remove(environment.id)} className="flex items-center gap-1 text-[13px] text-red-600 dark:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {environments.length === 0 && <p className="text-gray-500">No environments configured yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}