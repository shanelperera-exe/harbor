import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getProjects, createProject, type Project } from '../../services/projectService';
import { createEnvironment } from '../../services/environmentService';
import { getServices } from '../../services/serviceService';

const StaticIcon = ({ className }: { className?: string }) => (
  <svg fill="currentColor" className={className} width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path>
    <path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path>
  </svg>
);

const WebIcon = ({ className }: { className?: string }) => (
  <svg fill="currentColor" className={className} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path>
  </svg>
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
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-[1em] h-[1em]">
            <path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path>
            <path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path>
            <path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path>
          </svg>
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
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M13.5 8.38008C13.5 8.25508 13.5 8.13008 13.5 8.00008C13.5 7.87008 13.5 7.74508 13.5 7.61508L14.46 6.77508C14.637 6.61911 14.7531 6.40559 14.7879 6.17228C14.8226 5.93897 14.7738 5.70088 14.65 5.50008L13.47 3.50008C13.3823 3.34821 13.2562 3.22207 13.1044 3.13431C12.9526 3.04655 12.7804 3.00026 12.605 3.00008C12.4963 2.99925 12.3882 3.01614 12.285 3.05008L11.07 3.46008C10.8602 3.32068 10.6414 3.19541 10.415 3.08508L10.16 1.82508C10.1143 1.59488 9.98905 1.3881 9.80623 1.24093C9.62341 1.09376 9.39466 1.01558 9.16 1.02008H6.82C6.58535 1.01558 6.3566 1.09376 6.17378 1.24093C5.99096 1.3881 5.86573 1.59488 5.82 1.82508L5.565 3.08508C5.33697 3.19538 5.11649 3.32066 4.905 3.46008L3.715 3.03008C3.61065 3.00289 3.50259 2.99276 3.395 3.00008C3.21964 3.00026 3.04741 3.04655 2.89559 3.13431C2.74376 3.22207 2.61769 3.34821 2.53 3.50008L1.35 5.50008C1.2333 5.70058 1.18993 5.93541 1.22733 6.16436C1.26473 6.39332 1.38057 6.60214 1.555 6.75508L2.5 7.62008C2.5 7.74508 2.5 7.87008 2.5 8.00008C2.5 8.13008 2.5 8.25508 2.5 8.38508L1.555 9.22508C1.37564 9.37908 1.25663 9.59165 1.2191 9.82505C1.18158 10.0585 1.22795 10.2976 1.35 10.5001L2.53 12.5001C2.61769 12.6519 2.74376 12.7781 2.89559 12.8659C3.04741 12.9536 3.21964 12.9999 3.395 13.0001C3.50368 13.0009 3.61176 12.984 3.715 12.9501L4.93 12.5401C5.13977 12.6795 5.35859 12.8048 5.585 12.9151L5.84 14.1751C5.88573 14.4053 6.01096 14.6121 6.19378 14.7592C6.3766 14.9064 6.60535 14.9846 6.84 14.9801H9.2C9.43466 14.9846 9.66341 14.9064 9.84623 14.7592C10.029 14.6121 10.1543 14.4053 10.2 14.1751L10.455 12.9151C10.683 12.8048 10.9035 12.6795 11.115 12.5401L12.325 12.9501C12.4282 12.984 12.5363 13.0009 12.645 13.0001C12.8204 12.9999 12.9926 12.9536 13.1444 12.8659C13.2962 12.7781 13.4223 12.6519 13.51 12.5001L14.65 10.5001C14.7667 10.2996 14.8101 10.0648 14.7727 9.8358C14.7353 9.60685 14.6194 9.39802 14.445 9.24508L13.5 8.38008ZM12.605 12.0001L10.89 11.4201C10.4885 11.7601 10.0297 12.026 9.535 12.2051L9.18 14.0001H6.82L6.465 12.2251C5.97422 12.0409 5.51786 11.7755 5.115 11.4401L3.395 12.0001L2.215 10.0001L3.575 8.80008C3.48255 8.28251 3.48255 7.75265 3.575 7.23508L2.215 6.00008L3.395 4.00008L5.11 4.58008C5.51147 4.24003 5.97031 3.97421 6.465 3.79508L6.82 2.00008H9.18L9.535 3.77508C10.0258 3.95929 10.4821 4.22465 10.885 4.56008L12.605 4.00008L13.785 6.00008L12.425 7.20008C12.5175 7.71765 12.5175 8.24751 12.425 8.76508L13.785 10.0001L12.605 12.0001Z"></path><path d="M8 11.0001C7.40666 11.0001 6.82664 10.8241 6.33329 10.4945C5.83995 10.1648 5.45543 9.69631 5.22837 9.14813C5.0013 8.59995 4.94189 7.99675 5.05765 7.41481C5.1734 6.83287 5.45913 6.29832 5.87868 5.87876C6.29824 5.4592 6.83279 5.17348 7.41473 5.05773C7.99668 4.94197 8.59988 5.00138 9.14805 5.22844C9.69623 5.45551 10.1648 5.84002 10.4944 6.33337C10.8241 6.82672 11 7.40674 11 8.00008C11.004 8.39516 10.9292 8.78707 10.7798 9.15286C10.6305 9.51865 10.4096 9.85096 10.1303 10.1303C9.85089 10.4097 9.51857 10.6305 9.15278 10.7799C8.787 10.9292 8.39508 11.0041 8 11.0001ZM8 6.00008C7.73568 5.99392 7.47285 6.04145 7.22741 6.13978C6.98198 6.23811 6.75904 6.3852 6.57208 6.57216C6.38512 6.75912 6.23803 6.98205 6.1397 7.22749C6.04137 7.47292 5.99385 7.73575 6 8.00008C5.99385 8.26441 6.04137 8.52724 6.1397 8.77267C6.23803 9.01811 6.38512 9.24105 6.57208 9.42801C6.75904 9.61496 6.98198 9.01811 9.42793 9.42801C9.61489 9.24105 9.76198 9.01811 9.86031 8.77267C9.95864 8.52724 10.0062 8.26441 10 8.00008C10.0062 7.73575 9.95864 7.47292 9.86031 7.22749C9.76198 6.98205 9.61489 6.75912 9.42793 6.57216C9.24097 6.3852 9.01803 6.23811 8.7726 6.13978C8.52716 6.04145 8.26433 5.99392 8 6.00008Z"></path></svg>
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
