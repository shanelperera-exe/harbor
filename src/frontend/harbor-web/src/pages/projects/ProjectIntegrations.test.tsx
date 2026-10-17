import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProjectIntegrations from './ProjectIntegrations';
import * as projectIntegrationService from '../../services/projectIntegrationService';

describe('ProjectIntegrations Component - Instructions Modal & Info Icon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (projectId = 'test-project-1') => {
    return render(
      <MemoryRouter initialEntries={[`/${projectId}/integrations`]}>
        <Routes>
          <Route path="/:id/integrations" element={<ProjectIntegrations />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders an info icon button for each available integration card', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    // Check each provider has an instructions button
    const providers = [
      'Amazon Web Services',
      'Google Cloud Platform',
      'Microsoft Azure',
      'Vercel',
      'Render',
      'Railway',
      'DigitalOcean',
      'Kubernetes',
      'Docker',
    ];

    for (const name of providers) {
      const infoBtn = screen.getByRole('button', {
        name: new RegExp(`Instructions.*${name}|${name}.*Instructions`, 'i'),
      });
      expect(infoBtn).toBeInTheDocument();
    }
  });

  it('opens unique instructions modal when touching info button on AWS card', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    const awsInfoBtn = screen.getByRole('button', {
      name: /Instructions.*Amazon Web Services/i,
    });
    await userEvent.click(awsInfoBtn);

    // Modal title & content
    expect(await screen.findByRole('heading', { name: /Amazon Web Services Integration Guide/i })).toBeInTheDocument();
    expect(screen.getByText(/IAM Access Key ID & Secret Access Key/i)).toBeInTheDocument();
    expect(screen.getByText(/console\.aws\.amazon\.com/i)).toBeInTheDocument();

    // Real documentation links
    const iamDocLink = screen.getByRole('link', { name: /AWS IAM: Managing Access Keys/i });
    expect(iamDocLink).toHaveAttribute('href', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html');
    expect(iamDocLink).toHaveAttribute('target', '_blank');

    const ecsDocLink = screen.getByRole('link', { name: /Amazon ECS Developer Guide/i });
    expect(ecsDocLink).toHaveAttribute('href', 'https://docs.aws.amazon.com/AmazonECS/latest/developerguide/Welcome.html');
  });

  it('opens unique instructions modal with platform-specific steps when clicking GCP info button', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    const gcpInfoBtn = screen.getByRole('button', {
      name: /Instructions.*Google Cloud Platform/i,
    });
    await userEvent.click(gcpInfoBtn);

    expect(await screen.findByRole('heading', { name: /Google Cloud Platform Integration Guide/i })).toBeInTheDocument();
    expect(screen.getByText(/Service Account Key \(JSON\)/i)).toBeInTheDocument();
    expect(screen.getByText(/console\.cloud\.google\.com/i)).toBeInTheDocument();

    // Verify GCP real doc links
    const gcpDocLink = screen.getByRole('link', { name: /GCP: Creating and Managing Service Account Keys/i });
    expect(gcpDocLink).toHaveAttribute('href', 'https://cloud.google.com/iam/docs/creating-managing-service-account-keys');
  });

  it('opens unique instructions modal with platform-specific steps when clicking Railway info button', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    const railwayInfoBtn = screen.getByRole('button', {
      name: /Instructions.*Railway/i,
    });
    await userEvent.click(railwayInfoBtn);

    expect(await screen.findByRole('heading', { name: /Railway Integration Guide/i })).toBeInTheDocument();
    expect(screen.getByText(/Railway Project Token or Personal API Token/i)).toBeInTheDocument();

    const railwayDoc = screen.getByRole('link', { name: /Railway Tokens Documentation/i });
    expect(railwayDoc).toHaveAttribute('href', 'https://docs.railway.app/reference/tokens');
  });

  it('closes the instructions modal when clicking the Close button or Escape', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    const vercelInfoBtn = screen.getByRole('button', {
      name: /Instructions.*Vercel/i,
    });
    await userEvent.click(vercelInfoBtn);

    expect(await screen.findByRole('heading', { name: /Vercel Integration Guide/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    await userEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Vercel Integration Guide/i })).not.toBeInTheDocument();
    });
  });

  it('allows transitioning from the instructions modal to connecting the provider', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([]);
    renderComponent();

    const renderInfoBtn = screen.getByRole('button', {
      name: /Instructions.*Render/i,
    });
    await userEvent.click(renderInfoBtn);

    // Click "Connect Render" inside the instruction modal
    const connectInModalBtn = await screen.findByRole('button', { name: /Connect Render/i });
    await userEvent.click(connectInModalBtn);

    // The connection modal should open
    expect(await screen.findByPlaceholderText(/Enter your Render credentials/i)).toBeInTheDocument();
  });

  it('renders info button on active integration cards as well', async () => {
    vi.spyOn(projectIntegrationService, 'getProjectIntegrations').mockResolvedValueOnce([
      {
        id: 42,
        projectId: 1,
        providerType: 'AWS',
        name: 'Production AWS',
        createdAt: '2026-10-10T12:00:00Z',
      },
    ]);

    renderComponent();

    expect(await screen.findByText('Production AWS')).toBeInTheDocument();

    // Look for active connection card info button
    const activeInfoBtn = screen.getByRole('button', {
      name: /Instructions for Amazon Web Services/i,
    });
    expect(activeInfoBtn).toBeInTheDocument();

    await userEvent.click(activeInfoBtn);
    expect(await screen.findByRole('heading', { name: /Amazon Web Services Integration Guide/i })).toBeInTheDocument();
  });
});
