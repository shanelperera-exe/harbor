import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getProjects, createProject, type Project } from '../../services/projectService';
import { createEnvironment } from '../../services/environmentService';
import { getServices } from '../../services/serviceService';
import { Icon } from '../../components/icons';

const StaticIcon = ({ className }: { className?: string }) => (
  <Icon name="staticSite" className={className} />
);

const WebIcon = ({ className }: { className?: string }) => (
  <Icon name="globe" className={className} />
);

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newEnvName, setNewEnvName] = useState('Production');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  function fetchProjects() {
    setIsLoading(true);
    getProjects()
      .then(async (data) => {
        const projectsWithServices = await Promise.all(data.map(async (project) => {
          try {
            const services = await getServices(project.id);
            return { ...project, services };
          } catch (e) {
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
          type: 'Production' // Defaulting to Production for the initial environment
        });
      }

      setIsModalOpen(false);
      setNewProjectName('');
      setNewProjectDesc('');
      setNewEnvName('Production');
      fetchProjects(); // Refresh the list
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create project.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 md:px-12 mb-20 overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)] min-h-full">

      {/* Page header */}
      <div className="my-12 flex flex-col lg:flex-row lg:items-center justify-between gap-y-4">
        <h1 className="flex items-center gap-3 text-[28px] lg:text-[32px] font-medium text-gray-900 dark:text-white leading-tight tracking-tight">
          <Icon name="projects" className="w-[1em] h-[1em]" />
          Projects
        </h1>
      </div>

      {/* State: loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-[#8f8f8f] text-sm">
          <div className="w-4 h-4 border border-gray-300 dark:border-[#525252] border-t-[#8f8f8f] rounded-full animate-spin" />
          Loading projects...
        </div>
      )}

      {/* State: error */}
      {error && (
        <p className="text-[#f0989e] text-sm" data-testid="projects-error">
          {error}
        </p>
      )}

      {/* Projects section */}
      {!isLoading && !error && (
        <div className="flex flex-col gap-y-16">
          <div>
            {/* Project cards grid */}
            <ul
              className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6"
              data-testid="projects-list"
            >
              {/* Existing project cards */}
              {projects.map((project) => (
                <li key={project.id} className="grid items-stretch" data-testid="project-card">
                  <div className="relative group w-full h-full min-h-[160px] border border-gray-300 dark:border-[#3a3a3a] bg-slate-50 dark:bg-white/[0.03] cursor-pointer rounded-sm transition-all duration-200 hover:border-[#3b82f6] hover:bg-white dark:hover:bg-white/[0.06] flex flex-col overflow-hidden">
                    <Link
                      to={`/projects/${project.publicId || project.id}/environments`}
                      data-testid="project-environments-link"
                      className="flex-1 p-5 flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8ad6ff]"
                    >
                      {/* Project name & date */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="max-w-[85%]">
                          <h6 className="text-2xl font-regular text-gray-900 dark:text-[#f0f0f0] truncate">
                            {project.name}
                          </h6>
                          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      </div>

                      {/* Services Badges */}
                      <div className="mt-auto flex flex-wrap gap-2">
                        {project.services && project.services.length > 0 ? (
                          project.services.map(service => (
                            <div key={service.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 dark:bg-[#272727] border border-gray-300 dark:border-[#3a3a3a] text-xs font-medium text-gray-700 dark:text-gray-200">
                              {service.type === 'web' ? <WebIcon className="w-3.5 h-3.5" /> : <StaticIcon className="w-3.5 h-3.5" />}
                              {service.name}
                            </div>
                          ))
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1a1a] rounded border border-gray-300 dark:border-[#2a2a2a]">
                            No active services
                          </span>
                        )}
                      </div>
                    </Link>
                    
                    {/* Settings Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(`/projects/${project.publicId || project.id}/settings`);
                      }}
                      className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-[#2a2a2a] opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Project Settings"
                    >
                      <Icon name="settings" className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}

              {/* Create new project card */}
              <li className="grid items-stretch">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  data-testid="new-project-btn"
                  className="w-full border border-dashed border-gray-300 dark:border-[#525252] p-4 flex items-center justify-center py-8 relative cursor-pointer hover:border-[#3b82f6] transition-colors duration-150 group bg-transparent rounded-sm"
                >
                  <div className="inline-flex items-center gap-1.5 text-[18px] font-medium text-gray-600 dark:text-[#f0f0f0] group-hover:text-[#3b82f6] transition-colors">
                    <Plus className="w-4 h-4" />
                    Create new project
                  </div>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Create Project Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          {/* Modal Container */}
          <div className="inline-block w-full text-left align-middle bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-2xl border border-gray-300 dark:border-[#525252] max-w-xl relative rounded-sm">
            <form onSubmit={handleCreateProject} noValidate>
              
              {/* Header */}
              <div className="flex flex-col items-start border-b border-gray-300 dark:border-[#525252] px-6 py-4 relative">
                <div className="w-full pr-8">
                  <h1 className="text-[26px] font-medium text-gray-900 dark:text-white">Create a project</h1>
                  <div className="text-[14px] text-gray-500 dark:text-[#8f8f8f]">
                    <a href="/docs/projects" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">Projects</a> organize your services to make app development easier.
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-4 top-4 text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors p-2"
                  aria-label="Close modal"
                >
                  <Icon name="close" width="20" height="20" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col gap-6 text-[14px]">
                {createError && (
                  <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-sm">
                    {createError}
                  </div>
                )}
                
                <div className="flex flex-col">
                  <label htmlFor="new-project-name" className="font-medium text-gray-900 dark:text-white text-[15px] mb-2">Project name</label>
                  <input 
                    id="new-project-name"
                    type="text" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    className="h-10 w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none px-3 text-gray-900 dark:text-white transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="new-project-desc" className="font-medium text-gray-900 dark:text-white text-[15px] mb-2">Description</label>
                  <textarea 
                    id="new-project-desc"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none p-3 text-gray-900 dark:text-white transition-colors resize-y min-h-[80px]"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="new-environment-name" className="font-medium text-gray-900 dark:text-white text-[15px]">Environment name</label>
                  <div className="text-[14px] text-gray-500 dark:text-[#8f8f8f] mb-1.5 mt-0.5">Set up an initial environment. You can add a new environment at any time.</div>
                  <input 
                    id="new-environment-name"
                    type="text" 
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="e.g. Production"
                    className="h-10 w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none px-3 text-gray-900 dark:text-white transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-start gap-3 p-6 border-t border-gray-300 dark:border-[#525252]">
                <button 
                  type="submit" 
                  disabled={isCreating || !newProjectName.trim()}
                  className="h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#272727] dark:hover:bg-[#333] text-white font-medium border border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                >
                  {isCreating ? 'Creating...' : 'Create a project'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white font-medium border border-gray-300 dark:border-[#525252] transition-colors rounded-sm"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </main>
  );
}
