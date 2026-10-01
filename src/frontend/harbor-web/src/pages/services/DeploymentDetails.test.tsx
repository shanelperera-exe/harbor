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
});