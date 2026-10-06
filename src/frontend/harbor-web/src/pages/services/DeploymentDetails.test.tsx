import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import DeploymentDetails from './DeploymentDetails';

function ServiceLayout() {
  return <Outlet context={{ service: { repositoryName: 'owner/repo', repositoryUrl: 'https://github.com/owner/repo' }, deployRefreshKey: 0 }} />;
}

describe('DeploymentDetails', () => {
  it('shows the deployment project and deploying user rather than the signed-in user', async () => {
    localStorage.setItem('harbor_user', JSON.stringify({ username: 'signed-in-user' }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        id: 8,
        environment: 'staging',
        version: '1.5.0',
        status: 'Succeeded',
        startedAt: '2026-10-01T12:00:00Z',
        completedAt: '2026-10-01T12:01:00Z',
        projectName: 'Payments API',
        userName: 'deployment-author',
        logs: [],
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/services/13/deployments/dep-abc']}>
        <Routes>
          <Route path="/services/:serviceId" element={<ServiceLayout />}>
            <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('deployment-project-name')).toHaveTextContent('Payments API');
    expect(screen.getByTestId('deployment-user-name')).toHaveTextContent('deployment-author');
    expect(screen.queryByText('signed-in-user')).not.toBeInTheDocument();
  });

  it('renders "Deployment doesn\'t exist" when API returns 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ detail: 'Not found' }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/services/13/deployments/dep-missing']}>
        <Routes>
          <Route path="/services/:serviceId" element={<ServiceLayout />}>
            <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Deployment doesn't exist")).toBeInTheDocument();
  });

  it('renders "Not authenticated" when API returns 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: 'Unauthorized' }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/services/13/deployments/dep-unauth']}>
        <Routes>
          <Route path="/services/:serviceId" element={<ServiceLayout />}>
            <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Not authenticated')).toBeInTheDocument();
  });

  it('renders "Not authorized" when API returns 403', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ detail: 'Forbidden' }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/services/13/deployments/dep-forbidden']}>
        <Routes>
          <Route path="/services/:serviceId" element={<ServiceLayout />}>
            <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Not authorized')).toBeInTheDocument();
  });

  it('renders "Server problem" when API returns 500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ detail: 'Internal Server Error' }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/services/13/deployments/dep-server-error']}>
        <Routes>
          <Route path="/services/:serviceId" element={<ServiceLayout />}>
            <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Server problem')).toBeInTheDocument();
  });
});