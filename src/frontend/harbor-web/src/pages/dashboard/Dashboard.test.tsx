import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';
import * as dashboardService from '../../services/dashboardService';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Dashboard Component (US-20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Scenario 1 — displays user accessible projects on the dashboard', async () => {
    vi.spyOn(dashboardService, 'getDashboardSummary').mockResolvedValueOnce({
      projects: [
        {
          id: 10,
          publicId: 'proj-10',
          name: 'Payment Service',
          description: 'Payment gateway processor',
          ownerId: 1,
          createdAt: '2026-10-01T00:00:00Z',
          totalDeployments: 5,
          latestStatus: 'Succeeded',
        },
        {
          id: 20,
          publicId: 'proj-20',
          name: 'Auth Service',
          description: 'OAuth and JWT identity provider',
          ownerId: 1,
          createdAt: '2026-10-02T00:00:00Z',
          totalDeployments: 3,
          latestStatus: 'Running',
        },
      ],
      recentDeployments: [],
      metrics: {
        totalProjects: 2,
        totalDeployments: 8,
        successfulDeployments: 5,
        runningDeployments: 2,
        failedDeployments: 1,
      },
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Deployment Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Payment Service')).toBeInTheDocument();
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
    });

    expect(screen.getByText('Payment gateway processor')).toBeInTheDocument();
    expect(screen.getByText('OAuth and JWT identity provider')).toBeInTheDocument();
  });

  it('Scenario 2 — displays recent deployment activity with metadata', async () => {
    vi.spyOn(dashboardService, 'getDashboardSummary').mockResolvedValueOnce({
      projects: [
        { id: 10, name: 'Web App', ownerId: 1, createdAt: '2026-10-01T00:00:00Z', totalDeployments: 1 }
      ],
      recentDeployments: [
        {
          id: 101,
          publicId: 'dep-101',
          serviceId: 2,
          serviceName: 'Frontend UI',
          projectId: 10,
          projectName: 'Web App',
          environment: 'production',
          version: '2.1.0',
          commitSha: 'a1b2c3d4e5f6',
          commitMessage: 'release: ship dashboard feature',
          status: 'Succeeded',
          startedAt: '2026-10-03T10:00:00Z',
          userName: 'alice',
        },
      ],
      metrics: {
        totalProjects: 1,
        totalDeployments: 1,
        successfulDeployments: 1,
        runningDeployments: 0,
        failedDeployments: 0,
      },
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Deployment Activity')).toBeInTheDocument();
      expect(screen.getByText(/Web App \/ Frontend UI/)).toBeInTheDocument();
      expect(screen.getByText('production')).toBeInTheDocument();
      expect(screen.getByText('v2.1.0')).toBeInTheDocument();
      expect(screen.getByText(/ship dashboard feature/)).toBeInTheDocument();
      expect(screen.getByText('by alice')).toBeInTheDocument();
    });
  });

  it('Scenario 3 — clearly distinguishes successful, running, and failed deployment states', async () => {
    vi.spyOn(dashboardService, 'getDashboardSummary').mockResolvedValueOnce({
      projects: [{ id: 1, name: 'Core', ownerId: 1, createdAt: '2026-10-01T00:00:00Z', totalDeployments: 3 }],
      recentDeployments: [
        {
          id: 1,
          serviceId: 1,
          projectId: 1,
          environment: 'production',
          version: '1.0',
          status: 'Succeeded',
          startedAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 2,
          serviceId: 1,
          projectId: 1,
          environment: 'staging',
          version: '1.1',
          status: 'Running',
          startedAt: '2026-10-02T00:00:00Z',
        },
        {
          id: 3,
          serviceId: 1,
          projectId: 1,
          environment: 'dev',
          version: '1.2',
          status: 'Failed',
          startedAt: '2026-10-03T00:00:00Z',
        },
      ],
      metrics: {
        totalProjects: 1,
        totalDeployments: 3,
        successfulDeployments: 1,
        runningDeployments: 1,
        failedDeployments: 1,
      },
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Success').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Running').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Failed').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('Scenario 4 — selecting a deployment navigates to its deployment details', async () => {
    const user = userEvent.setup();
    vi.spyOn(dashboardService, 'getDashboardSummary').mockResolvedValueOnce({
      projects: [{ id: 5, name: 'Harbor API', ownerId: 1, createdAt: '2026-10-01T00:00:00Z', totalDeployments: 1 }],
      recentDeployments: [
        {
          id: 77,
          publicId: 'dep-778899',
          serviceId: 14,
          projectId: 5,
          projectName: 'Harbor API',
          serviceName: 'Gateway',
          environment: 'production',
          version: '3.0.0',
          status: 'Succeeded',
          startedAt: '2026-10-03T12:00:00Z',
        },
      ],
      metrics: {
        totalProjects: 1,
        totalDeployments: 1,
        successfulDeployments: 1,
        runningDeployments: 0,
        failedDeployments: 0,
      },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('deployment-item-77')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('deployment-item-77'));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/projects/5/services/14/deployments/dep-778899'
    );
  });

  it('renders onboarding empty state when no projects exist', async () => {
    vi.spyOn(dashboardService, 'getDashboardSummary').mockResolvedValueOnce({
      projects: [],
      recentDeployments: [],
      metrics: {
        totalProjects: 0,
        totalDeployments: 0,
        successfulDeployments: 0,
        runningDeployments: 0,
        failedDeployments: 0,
      },
    });

    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome to Harbor')).toBeInTheDocument();
      expect(screen.getByText(/You don't have any projects yet/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /New Project/ })).toBeInTheDocument();
    });
  });
});
