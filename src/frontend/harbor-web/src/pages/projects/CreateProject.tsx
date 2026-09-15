import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../services/projectService';

export default function CreateProject() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        repositoryUrl: repositoryUrl.trim() || undefined,
      });
      navigate('/projects', { state: { createdProjectId: project.id } });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Unable to create project.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <h1 className="text-3xl font-semibold mb-8">
        Create a new <span className="text-gray-500 dark:text-gray-400">Project</span>
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

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="create-project-button"
          className="h-10 w-full sm:w-auto sm:px-8 bg-black dark:bg-white text-white dark:text-black font-medium disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Creating...' : 'Create Project'}
        </button>
      </form>
    </div>
  );
}