import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProject, updateProject, archiveProject, type Project } from '../../services/projectService';

export default function EditProject() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(projectId)) {
      setLoadError('Invalid project.');
      setIsLoading(false);
      return;
    }

    getProject(projectId)
      .then((found) => {
        if (!found) {
          setLoadError('Project not found.');
          return;
        }
        setProject(found);
        setName(found.name);
        setDescription(found.description ?? '');
        setRepositoryUrl(found.repositoryUrl ?? '');
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Unable to load project.'))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const newErrors: { name?: string } = {};
    if (!name.trim()) newErrors.name = 'Project name is required';
    else if (name.trim().length < 3) newErrors.name = 'Project name must be at least 3 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      await updateProject(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
        repositoryUrl: repositoryUrl.trim() || undefined,
      });
      navigate('/projects', { state: { updatedProjectId: projectId } });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Unable to update project.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Archive this project? It will no longer appear in your active project list.')) {
      return;
    }

    setIsArchiving(true);
    setErrors({});

    try {
      await archiveProject(projectId);
      navigate('/projects', { state: { archivedProjectId: projectId } });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Unable to archive project.' });
      setIsArchiving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white bg-white dark:bg-[#090909]">
        <p className="text-gray-500">Loading project...</p>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white bg-white dark:bg-[#090909]">
        <p className="text-red-500" data-testid="edit-project-load-error">{loadError ?? 'Project not found.'}</p>
        <Link to="/projects" className="text-blue-600 dark:text-[#a585ff] text-[15px]">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <h1 className="text-3xl font-semibold mb-8">
        Edit <span className="text-gray-500 dark:text-gray-400">{project.name}</span>
      </h1>

      <form onSubmit={handleSubmit} noValidate className="max-w-xl flex flex-col space-y-5">
        <div className="flex flex-col space-y-2">
          <label className="text-[15px] font-medium">Project Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`h-10 w-full bg-transparent border ${errors.name ? 'border-red-500' : 'border-black dark:border-[#6b6b6b]'} px-3 focus:outline-none focus:ring-1 transition-colors`}
            placeholder="my-api-service"
            data-testid="project-name-input"
          />
          {errors.name && <p className="text-red-500 dark:text-red-400 text-[13px]">{errors.name}</p>}
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-[15px] font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-transparent border border-black dark:border-[#6b6b6b] px-3 py-2 focus:outline-none focus:ring-1"
            placeholder="What does this project do?"
            data-testid="project-description-input"
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-[15px] font-medium">Repository URL</label>
          <input
            type="text"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            className="h-10 w-full bg-transparent border border-black dark:border-[#6b6b6b] px-3 focus:outline-none focus:ring-1"
            placeholder="https://github.com/your-org/your-repo"
            data-testid="project-repo-input"
          />
        </div>

        {errors.general && (
          <div data-testid="error-message" className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{errors.general}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={isSubmitting || isArchiving}
            data-testid="save-project-button"
            className="h-10 w-full sm:w-auto sm:px-8 bg-black dark:bg-white text-white dark:text-black font-medium disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleArchive}
            disabled={isSubmitting || isArchiving}
            data-testid="archive-project-button"
            className="h-10 w-full sm:w-auto sm:px-8 border border-red-500 text-red-600 dark:text-red-400 font-medium disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isArchiving ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </form>
    </div>
  );
}