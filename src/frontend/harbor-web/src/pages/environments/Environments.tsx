import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { getProjects, type Project } from '../../services/projectService';

export default function Environments() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(err => setError(err instanceof Error ? err.message : 'Unable to load projects.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <h1 className="text-3xl font-semibold">Environments</h1>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-xl">
        Environments belong to a project. Pick a project to view or configure its deployment targets.
      </p>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mt-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /><p>{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 mt-5">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-500 mt-5">You don't have any projects yet.</p>
      ) : (
        <div className="mt-7 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.filter(p => !p.isArchived).map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}/environments`}
              className="flex items-center justify-between p-5 border border-gray-300 dark:border-[#525252] bg-white dark:bg-[#111111] hover:bg-gray-50 dark:hover:bg-[#151515] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-lg font-medium truncate" title={project.name}>{project.name}</p>
                {project.description && (
                  <p className="text-gray-500 dark:text-[#a1a1aa] text-[15px] truncate">{project.description}</p>
                )}
              </div>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}