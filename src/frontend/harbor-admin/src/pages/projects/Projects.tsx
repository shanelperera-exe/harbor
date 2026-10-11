import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderGit2, 
  Search, 
  RefreshCw, 
  Layers, 
  Trash2, 
  Plus,
  Server,
  Globe
} from 'lucide-react';
import { formatDistanceToNow, format } from '../../utils/dateUtils';
import { getProjects, createProject, deleteProject, type Project } from '../../services/projectService';
import { createEnvironment } from '../../services/environmentService';
import { getServices } from '../../services/serviceService';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state for admin project provisioning
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newEnvName, setNewEnvName] = useState('Production');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  function fetchProjects() {
    setIsLoading(true);
    getProjects()
      .then(async (data) => {
        const projectsWithServices = await Promise.all(data.map(async (project) => {
          try {
            const services = await getServices(project.id);
            return { ...project, services };
          } catch {
            return { ...project, services: [] };
          }
        }));
        setProjects(projectsWithServices);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load projects.'))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    
    if (!newProjectName.trim()) {
      setCreateError('Project name is required');
      return;
    }

    setIsCreating(true);
    try {
      const project = await createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });

      if (newEnvName.trim()) {
        await createEnvironment(project.id, {
          name: newEnvName.trim(),
          type: 'Production'
        });
      }

      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewEnvName('Production');
      fetchProjects();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create project.');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    if (!window.confirm(`Are you sure you want to permanently delete project "${project.name}" (ID: ${project.id}) across all tenants?`)) {
      return;
    }
    setActionLoadingId(project.id);
    try {
      await deleteProject(project.id);
      setProjects(prev => prev.filter(p => p.id !== project.id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete project.');
    } finally {
      setActionLoadingId(null);
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.publicId && p.publicId.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [projects, searchQuery]);

  return (
    <div className="w-full min-h-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white px-4 py-6 sm:px-8 sm:py-8 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-gray-300 dark:border-[#3c4043] gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-gray-900 dark:text-white">
              Tenant Projects Directory
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-gray-100 dark:bg-[#2c2d30] border border-gray-300 dark:border-[#3c4043] text-gray-600 dark:text-[#bdc1c6]">
              {projects.length} provisioned
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-[#9aa0a6] mt-1 font-normal">
            Cross-tenant project supervision, microservice configurations, and environment resources.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={fetchProjects}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 text-xs font-medium px-3 py-2 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-2 bg-[#2563eb] hover:bg-blue-700 text-white rounded-sm transition-colors focus:outline-none"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Provision Project</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 my-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, description, or public ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#9aa0a6]"
          />
        </div>
      </div>

      {/* Projects Table */}
      <div className="border border-gray-300 dark:border-[#3c4043] rounded-sm overflow-hidden bg-white dark:bg-[#202124]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#3c4043] bg-gray-50/75 dark:bg-[#28292c] text-gray-600 dark:text-[#9aa0a6] font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Project Name & ID</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Microservices</th>
                <th className="py-2.5 px-3">Owner Tenant</th>
                <th className="py-2.5 px-3">Created</th>
                <th className="py-2.5 px-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3c4043]">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    <div className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading projects catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-red-500 font-mono">
                    {error}
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-[#9aa0a6]">
                    No projects found matching query.
                  </td>
                </tr>
              ) : (
                filteredProjects.map(proj => {
                  const isBusy = actionLoadingId === proj.id;
                  const services = proj.services || [];

                  return (
                    <tr 
                      key={proj.id} 
                      className="hover:bg-gray-50/80 dark:hover:bg-[#27282b] transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2.5">
                          <FolderGit2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {proj.name}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 dark:text-[#9aa0a6]">
                              {proj.publicId || `proj_${proj.id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-2.5 px-3 text-gray-600 dark:text-[#bdc1c6] max-w-sm truncate">
                        {proj.description || '—'}
                      </td>

                      {/* Services */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {services.length > 0 ? (
                            services.map(s => (
                              <span 
                                key={s.id} 
                                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-sm bg-gray-100 dark:bg-[#3c4043] text-gray-700 dark:text-[#bdc1c6] text-[10px] font-mono"
                              >
                                {s.type === 'web' ? <Globe className="w-2.5 h-2.5" /> : <Server className="w-2.5 h-2.5" />}
                                <span>{s.name}</span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-gray-400 font-mono">0 services</span>
                          )}
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 dark:text-[#bdc1c6]">
                        Tenant #{proj.ownerId}
                      </td>

                      {/* Created */}
                      <td className="py-2.5 px-3 text-gray-500 dark:text-[#9aa0a6] text-[11px] whitespace-nowrap">
                        {format(proj.createdAt, 'MMM dd, yyyy')}
                        <span className="block text-[10px] text-gray-400">
                          {formatDistanceToNow(proj.createdAt, { addSuffix: true })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/environments`)}
                            className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors inline-flex items-center space-x-1"
                          >
                            <Layers className="w-3 h-3 text-gray-400" />
                            <span>Envs</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteProject(proj)}
                            disabled={isBusy}
                            className="px-2 py-1 border border-gray-300 dark:border-[#3c4043] rounded-sm text-[11px] font-normal text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 inline-flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm p-6 space-y-4">
            <div>
              <h2 className="text-base font-medium text-gray-900 dark:text-white">Provision New Tenant Project</h2>
              <p className="text-xs text-gray-500 dark:text-[#9aa0a6] mt-0.5">
                Initializes a project container and bootstraps production environment.
              </p>
            </div>

            {createError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-sm font-mono">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. payment-service"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Description</label>
                <textarea
                  value={newProjectDesc}
                  onChange={e => setNewProjectDesc(e.target.value)}
                  rows={2}
                  placeholder="Project purpose and scope..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-y"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">Initial Environment</label>
                <input
                  type="text"
                  value={newEnvName}
                  onChange={e => setNewEnvName(e.target.value)}
                  placeholder="Production"
                  className="w-full px-3 py-1.5 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-gray-300 dark:border-[#3c4043] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-[#3c4043] rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] text-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newProjectName.trim()}
                  className="px-3 py-1.5 bg-[#2563eb] hover:bg-blue-700 text-white rounded-sm disabled:opacity-50"
                >
                  {isCreating ? 'Provisioning...' : 'Provision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
