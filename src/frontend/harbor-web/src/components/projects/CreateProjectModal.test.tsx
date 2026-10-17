import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectModal } from './CreateProjectModal';
import * as projectService from '../../services/projectService';
import * as environmentService from '../../services/environmentService';

describe('CreateProjectModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(<CreateProjectModal isOpen={false} onClose={onClose} onSuccess={onSuccess} />);
    expect(screen.queryByTestId('create-project-modal')).not.toBeInTheDocument();
  });

  it('renders correctly when isOpen is true', () => {
    render(<CreateProjectModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    expect(screen.getByTestId('create-project-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create a project' })).toBeInTheDocument();
    expect(screen.getByTestId('new-project-name')).toBeInTheDocument();
    expect(screen.getByTestId('new-project-desc')).toBeInTheDocument();
    expect(screen.getByTestId('new-environment-name')).toHaveValue('Production');
    expect(screen.getByTestId('btn-submit-create-project')).toBeDisabled();
  });

  it('calls onClose when clicking close button or cancel button', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByTestId('btn-close-modal'));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('btn-cancel-create-project'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape key press', async () => {
    const user = userEvent.setup();
    render(<CreateProjectModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('creates project and environment on submit and triggers onSuccess and onClose', async () => {
    const user = userEvent.setup();
    const mockCreatedProject: projectService.Project = {
      id: 42,
      publicId: 'proj-42',
      name: 'Alpha App',
      description: 'Alpha App Description',
      ownerId: 1,
      isArchived: false,
      createdAt: new Date().toISOString(),
    };

    const mockCreatedEnv: environmentService.DeploymentEnvironment = {
      id: 1,
      projectId: 42,
      name: 'Staging',
      type: 'Production',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const createProjectSpy = vi.spyOn(projectService, 'createProject').mockResolvedValue(mockCreatedProject);
    const createEnvSpy = vi.spyOn(environmentService, 'createEnvironment').mockResolvedValue(mockCreatedEnv);

    render(<CreateProjectModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(screen.getByTestId('new-project-name'), 'Alpha App');
    await user.type(screen.getByTestId('new-project-desc'), 'Alpha App Description');
    await user.clear(screen.getByTestId('new-environment-name'));
    await user.type(screen.getByTestId('new-environment-name'), 'Staging');

    expect(screen.getByTestId('btn-submit-create-project')).not.toBeDisabled();
    await user.click(screen.getByTestId('btn-submit-create-project'));

    await waitFor(() => {
      expect(createProjectSpy).toHaveBeenCalledWith({
        name: 'Alpha App',
        description: 'Alpha App Description',
      });
      expect(createEnvSpy).toHaveBeenCalledWith(42, {
        name: 'Staging',
        type: 'Production',
      });
      expect(onSuccess).toHaveBeenCalledWith(mockCreatedProject);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays error message if project creation fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(projectService, 'createProject').mockRejectedValue(new Error('Project name already exists'));

    render(<CreateProjectModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    await user.type(screen.getByTestId('new-project-name'), 'Existing App');
    await user.click(screen.getByTestId('btn-submit-create-project'));

    await waitFor(() => {
      expect(screen.getByTestId('create-project-error')).toHaveTextContent('Project name already exists');
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
