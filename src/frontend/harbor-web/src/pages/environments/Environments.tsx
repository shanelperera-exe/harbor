import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { getProjects, type Project } from '../../services/projectService';
import { Icon } from '../../components/icons';
import SectionTitle from '../../components/ui/SectionTitle';

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
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-8">
        <SectionTitle
          icon={<Icon name="environments" />}
          title="Environments"
          description="Environments belong to a project. Pick a project to view or configure its deployment targets."
        />

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm py-8">
            <div className="w-4 h-4 border border-gray-300 dark:border-[#525252] border-t-gray-500 rounded-full animate-spin" />
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-gray-300 dark:border-[#525252] rounded-sm p-12 text-center text-gray-500 dark:text-[#a1a1aa]">
            You don't have any projects yet. Create a project to configure environments.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.filter(p => !p.isArchived).map(project => (
              <Link
                key={project.id}
                to={`/projects/${project.id}/environments`}
                className="flex items-center justify-between p-5 border border-gray-300 dark:border-[#525252] bg-white dark:bg-white/[0.02] hover:bg-gray-50/70 dark:hover:bg-white/[0.04] hover:border-[#2563eb] rounded-sm transition-colors group"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-[16px] font-medium text-gray-900 dark:text-white group-hover:text-[#2563eb] dark:group-hover:text-blue-400 transition-colors truncate" title={project.name}>
                    {project.name}
                  </p>
                  {project.description && (
                    <p className="text-gray-500 dark:text-[#a1a1aa] text-sm mt-1 truncate">
                      {project.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-[#2563eb] group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}