import React, { useState, useEffect } from 'react';
import { createProject, type Project } from '../../services/projectService';
import { createEnvironment } from '../../services/environmentService';
import { Icon } from '../icons';

export interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (project: Project) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newEnvName, setNewEnvName] = useState('Production');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setNewProjectName('');
      setNewProjectDesc('');
      setNewEnvName('Production');
      setCreateError(null);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
          type: 'Production',
        });
      }

      onClose();
      if (onSuccess) {
        onSuccess(project);
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Unable to create project.');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="presentation"
      data-testid="create-project-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Container */}
      <div className="inline-block w-full text-left align-middle bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] max-w-xl relative rounded-sm shadow-xl">
        <form onSubmit={handleCreateProject} noValidate>
          {/* Header */}
          <div className="flex flex-col items-start border-b border-gray-300 dark:border-[#525252] px-6 py-4 relative">
            <div className="w-full pr-8">
              <h1 className="text-[26px] font-medium text-gray-900 dark:text-white">Create a project</h1>
              <div className="text-[14px] text-gray-500 dark:text-[#8f8f8f]">
                <a href="/docs/projects" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">
                  Projects
                </a>{' '}
                organize your services to make app development easier.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="btn-close-modal"
              className="absolute right-4 top-4 text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors p-2"
              aria-label="Close modal"
            >
              <Icon name="close" width="20" height="20" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-6 text-[14px]">
            {createError && (
              <div className="p-3 bg-red-950/50 border border-red-900 text-red-400 rounded-sm" data-testid="create-project-error">
                {createError}
              </div>
            )}

            <div className="flex flex-col">
              <label htmlFor="new-project-name" className="font-medium text-gray-900 dark:text-white text-[15px] mb-2">
                Project name
              </label>
              <input
                id="new-project-name"
                data-testid="new-project-name"
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                placeholder="my-project"
                className="h-10 w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none px-3 text-gray-900 dark:text-white transition-colors rounded-sm"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="new-project-desc" className="font-medium text-gray-900 dark:text-white text-[15px] mb-2">
                Description
              </label>
              <textarea
                id="new-project-desc"
                data-testid="new-project-desc"
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                rows={2}
                placeholder="What does this project do?"
                className="w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none p-3 text-gray-900 dark:text-white transition-colors resize-y min-h-[80px] rounded-sm"
              />
            </div>

            <div className="flex flex-col">
              <label htmlFor="new-environment-name" className="font-medium text-gray-900 dark:text-white text-[15px]">
                Environment name
              </label>
              <div className="text-[14px] text-gray-500 dark:text-[#8f8f8f] mb-1.5 mt-0.5">
                Set up an initial environment. You can add a new environment at any time.
              </div>
              <input
                id="new-environment-name"
                data-testid="new-environment-name"
                type="text"
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                placeholder="e.g. Production"
                className="h-10 w-full bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none px-3 text-gray-900 dark:text-white transition-colors rounded-sm"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-start gap-3 p-6 border-t border-gray-300 dark:border-[#525252]">
            <button
              type="submit"
              disabled={isCreating || !newProjectName.trim()}
              data-testid="btn-submit-create-project"
              className="h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#272727] dark:hover:bg-[#333] text-white font-medium border border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
            >
              {isCreating ? 'Creating...' : 'Create a project'}
            </button>
            <button
              type="button"
              onClick={onClose}
              data-testid="btn-cancel-create-project"
              className="h-10 px-4 bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white font-medium border border-gray-300 dark:border-[#525252] transition-colors rounded-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
