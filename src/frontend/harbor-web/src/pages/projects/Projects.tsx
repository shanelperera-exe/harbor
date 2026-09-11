import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, type Project } from '../../services/projectService';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to load projects.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-semibold">Projects</h1>
        <Link
          to="/projects/new"
          data-testid="new-project-link"
          className="h-10 px-5 flex items-center bg-black dark:bg-white text-white dark:text-black font-medium"
        >
          New Project
        </Link>
      </div>

      {isLoading && <p className="text-gray-500">Loading projects...</p>}
      {error && <p className="text-red-500" data-testid="projects-error">{error}</p>}

      {!isLoading && !error && projects.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">You don't have any projects yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="projects-list">
        {projects.map((project) => (
          <div
            key={project.id}
            data-testid="project-card"
            className="p-5 border border-gray-200 dark:border-[#333] bg-white dark:bg-[#111111]"
          >
            <h2 className="text-lg font-medium mb-1">{project.name}</h2>
            {project.description && (
              <p className="text-gray-500 dark:text-[#a1a1aa] text-[15px] mb-3">{project.description}</p>
            )}
            {project.repositoryUrl && (
              <a
                href={project.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-[#a585ff] text-[13px] break-all"
              >
                {project.repositoryUrl}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}