import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { getProjects, createProject, type Project } from '../../services/projectService';
import { createEnvironment } from '../../services/environmentService';

export default function Projects() {
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
      .then(setProjects)
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
    <main className="w-full max-w-[1920px] mx-auto px-4 md:px-12 mb-20 overflow-y-auto bg-[#090909] min-h-full">

      {/* Page header */}
      <div className="my-12 flex flex-col lg:flex-row lg:items-center justify-between gap-y-4">
        <h1 className="text-[28px] lg:text-[32px] font-medium text-white leading-tight tracking-tight">
          Projects
        </h1>
      </div>

      {/* State: loading */}
      {isLoading && (
        <div className="flex items-center gap-2 text-[#8f8f8f] text-sm">
          <div className="w-4 h-4 border border-[#4d4d4d] border-t-[#8f8f8f] rounded-full animate-spin" />
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
                  <Link
                    to={`/projects/${project.id}/environments`}
                    data-testid="project-environments-link"
                    className="w-full border border-[#6b6b6b] p-4 text-[#f0f0f0] cursor-pointer
                               transition-colors duration-150
                               hover:border-[#3b82f6] hover:bg-[#0f2d4a]
                               active:border-[#3b82f6] active:bg-[#0f2d4a]
                               focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8ad6ff]"
                  >
                    <div className="grid grid-cols-1 gap-6">
                      {/* Project name */}
                      <div className="flex items-start justify-between gap-2">
                        <h6 className="text-2xl font-regular text-[#f0f0f0] min-w-0 flex-1">
                          <span className="block truncate">{project.name}</span>
                        </h6>
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center gap-2 h-7">
                        <span className="inline-flex items-center px-2 h-7 text-sm font-regular border border-transparent bg-[#272727] text-white">
                          <span className="truncate block max-w-[296px]">
                            No active services
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}

              {/* Create new project card */}
              <li className="grid items-stretch">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  data-testid="new-project-btn"
                  className="w-full border border-dashed border-[#6b6b6b] p-4 flex items-center justify-center py-8 relative cursor-pointer hover:border-[#3b82f6] transition-colors duration-150 group bg-transparent"
                >
                  <div className="inline-flex items-center gap-1.5 text-[18px] font-medium text-[#f0f0f0] group-hover:text-[#3b82f6] transition-colors">
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
          <div className="inline-block w-full text-left align-middle bg-[#090909] shadow-2xl border border-[#333] max-w-xl relative">
            <form onSubmit={handleCreateProject} noValidate>
              
              {/* Header */}
              <div className="flex flex-col items-start border-b border-[#333] px-6 py-4 relative">
                <div className="w-full pr-8">
                  <h1 className="text-[26px] font-medium text-white">Create a project</h1>
                  <div className="text-[14px] text-[#8f8f8f]">
                    <a href="/docs/projects" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">Projects</a> organize your services to make app development easier.
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-4 top-4 text-[#8f8f8f] hover:text-white transition-colors p-2"
                  aria-label="Close modal"
                >
                  <svg fill="currentColor" width="20" height="20" viewBox="0 0 16 16"><path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path></svg>
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
                  <label htmlFor="new-project-name" className="font-medium text-white text-[15px] mb-2">Project name</label>
                  <input 
                    id="new-project-name"
                    type="text" 
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    autoFocus
                    className="h-10 w-full bg-transparent border border-[#4d4d4d] hover:border-[#6b6b6b] focus:border-[#3b82f6] focus:outline-none px-3 text-white transition-colors"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="new-project-desc" className="font-medium text-white text-[15px] mb-2">Description</label>
                  <textarea 
                    id="new-project-desc"
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-transparent border border-[#4d4d4d] hover:border-[#6b6b6b] focus:border-[#3b82f6] focus:outline-none p-3 text-white transition-colors resize-y min-h-[80px]"
                  />
                </div>

                <div className="flex flex-col">
                  <label htmlFor="new-environment-name" className="font-medium text-white text-[15px]">Environment name</label>
                  <div className="text-[14px] text-[#8f8f8f] mb-1.5 mt-0.5">Set up an initial environment. You can add a new environment at any time.</div>
                  <input 
                    id="new-environment-name"
                    type="text" 
                    value={newEnvName}
                    onChange={(e) => setNewEnvName(e.target.value)}
                    placeholder="e.g. Production"
                    className="h-10 w-full bg-transparent border border-[#4d4d4d] hover:border-[#6b6b6b] focus:border-[#3b82f6] focus:outline-none px-3 text-white transition-colors"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-start gap-3 p-6 border-t border-[#333]">
                <button 
                  type="submit" 
                  disabled={isCreating || !newProjectName.trim()}
                  className="h-10 px-4 bg-[#272727] hover:bg-[#333] text-white font-medium border border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create a project'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="h-10 px-4 bg-transparent hover:bg-[#1a1a1a] text-white font-medium border border-[#4d4d4d] transition-colors"
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
