import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getProjects, type Project } from '../../services/projectService';
import { getServices } from '../../services/serviceService';
import { Icon } from '../../components/icons';
import SectionTitle from '../../components/ui/SectionTitle';
import { CreateProjectModal } from '../../components/projects/CreateProjectModal';

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

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-8">
        <SectionTitle
          icon={<Icon name="projects" />}
          title="Projects"
          description="Manage your projects, services, and environments."
          actions={
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              data-testid="new-project-btn-header"
              className="inline-flex items-center gap-2 h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-[Geist] font-medium text-sm rounded-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          }
        />

        {/* State: loading */}
        {isLoading && (
          <div className="flex items-center gap-2 text-[#8f8f8f] text-sm py-8">
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
                    <div className="relative group w-full h-full min-h-[160px] border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] cursor-pointer rounded-sm transition-colors hover:border-[#2563eb] hover:bg-gray-50/70 dark:hover:bg-white/[0.04] flex flex-col overflow-hidden">
                      <Link
                        to={`/projects/${project.publicId || project.id}/environments`}
                        data-testid="project-environments-link"
                        className="flex-1 p-5 flex flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8ad6ff]"
                      >
                        {/* Project name & date */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="max-w-[85%]">
                            <h6 data-testid="project-name" className="text-xl font-medium text-gray-900 dark:text-[#f0f0f0] truncate">
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
                              <div key={service.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-[#525252] text-xs font-medium text-gray-700 dark:text-gray-200">
                                {service.type === 'web' ? <WebIcon className="w-3.5 h-3.5" /> : <StaticIcon className="w-3.5 h-3.5" />}
                                {service.name}
                              </div>
                            ))
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.02] rounded-xs border border-gray-300 dark:border-[#525252]">
                              No active services
                            </span>
                          )}
                        </div>
                      </Link>
                      
                      {/* Settings Button */}
                      <button
                        data-testid="project-settings-button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/projects/${project.publicId || project.id}/settings`);
                        }}
                        className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors rounded-sm hover:bg-gray-100 dark:hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
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
                    className="w-full border border-dashed border-gray-300 dark:border-[#525252] p-4 flex items-center justify-center py-8 relative cursor-pointer hover:border-[#2563eb] transition-colors duration-150 group bg-transparent rounded-sm"
                  >
                    <div className="inline-flex items-center gap-1.5 text-[16px] font-medium text-gray-600 dark:text-[#f0f0f0] group-hover:text-[#2563eb] transition-colors">
                      <Plus className="w-4 h-4" />
                      <span>Create new project</span>
                    </div>
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Create Project Modal */}
        <CreateProjectModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => fetchProjects()}
        />

      </main>
    </div>
  );
}
