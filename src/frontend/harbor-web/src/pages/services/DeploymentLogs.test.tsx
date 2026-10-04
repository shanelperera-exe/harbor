import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { DeploymentLogs } from './DeploymentLogs';
import type { DeploymentDetails, DeploymentLog } from '../../services/deploymentService';

/**
 * US-19 — deployment logs UI.
 *
 * DeploymentLogs is a pure function of the `deployment` prop, so the parser is exercised
 * without touching the network. Log lines follow the GitHub Actions format that
 * GitHubActionsClient.FetchRunLogsAsync writes into DeploymentLogs:
 *
 *   === 1_setup.txt ===
 *   2026-10-01T12:00:00.0000000Z Setting up job
 *   ##[group]Run actions/checkout@v4
 *   ##[endgroup]
 *   ##[error]Process completed with exit code 1
 *
 * NOTE: every step and group starts collapsed (see the "KNOWN_GAP_D01" tests), so any
 * assertion about visible log content must click "Expand all" first — which is also what a
 * real user and the Selenium DeploymentDetailsPage do.
 */

const T0 = '2026-10-01T12:00:00.0000000Z';

function makeDeployment(overrides: Partial<DeploymentDetails> = {}): DeploymentDetails {
  return {
    id: 1,
    publicId: 'dep-abc123def',
    hash: 'abc123def',
    serviceId: 13,
    environment: 'production',
    version: '1.0.0',
    status: 'Succeeded',
    startedAt: '2026-10-01T12:00:00Z',
    completedAt: '2026-10-01T12:01:00Z',
    workflowFile: 'deploy.yml',
    projectName: 'Payments API',
    serviceName: 'api',
    userName: 'test-owner',
    logs: [],
    ...overrides,
  } as DeploymentDetails;
}

const log = (message: string, offsetSeconds = 0, level = 'Info'): DeploymentLog => ({
  timestamp: new Date(Date.UTC(2026, 9, 1, 12, 0, offsetSeconds)).toISOString(),
  level,
  message,
});

/** Standard GitHub Actions payload with three steps and an error in the last one. */
const actionsLogs: DeploymentLog[] = [
  log('=== 1_setup.txt ===', 0),
  log(`${T0} Setting up job`, 1),
  log(`${T0} ##[group]Run actions/checkout@v4`, 2),
  log(`${T0} Checking out repository`, 3),
  log(`${T0} ##[endgroup]`, 4),
  log('=== 2_build.txt ===', 5),
  log(`${T0} Building project`, 6),
  log('=== 3_deploy.txt ===', 7),
  log(`${T0} Deploying to production`, 8),
  log(`${T0} ##[error]Process completed with exit code 1`, 9, 'Error'),
];

const expandAll = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByTestId('expand-all-logs-button'));

/**
 * renderLogLineText splits a line into several <span>s for syntax highlighting, so
 * getByText() cannot match it. Assert against the flattened document text instead.
 */
const bodyText = () => document.body.textContent ?? '';

/**
 * userEvent.setup() installs its own clipboard stub on `navigator`, replacing anything set
 * beforehand — so the spy has to be attached after setup(), not in a beforeEach.
 */
const setupWithClipboardSpy = () => {
  const user = userEvent.setup();
  const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
  return { user, writeText };
};

describe('DeploymentLogs', () => {
  afterEach(() => vi.restoreAllMocks());

  // ─── Parsing: step structure ──────────────────────────────────────────────

  it('splits GitHub Actions logs into one step per === N_name.txt === marker', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);

    // Step names are prettified: "1_setup.txt" -> "Setup".
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();

    await expandAll(user);
    expect(screen.getAllByTestId('deployment-log-line').length).toBeGreaterThan(0);
  });

  it('strips the GitHub Actions timestamp prefix from displayed line text', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    // The raw ISO timestamp must not be shown inline...
    expect(screen.queryByText(/^2026-10-01T12:00:00\.0000000Z /)).not.toBeInTheDocument();
    // ...but the message itself must survive.
    expect(bodyText()).toContain('Setting up job');
  });

  it('hides the ##[endgroup] marker line itself', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    expect(bodyText()).not.toContain('##[endgroup]');
    expect(bodyText()).toContain('Run actions/checkout@v4');
  });

  it('keeps group body lines hidden until the group is expanded', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    // Expand-all expands groups too, so the body must be reachable.
    expect(bodyText()).toContain('Checking out repository');
  });

  it('marks only the step containing ##[error] as failed', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ status: 'Failed', logs: actionsLogs })} />);

    // One failed step icon out of three steps.
    const failed = document.querySelectorAll('.text-red-500');
    expect(failed.length).toBeGreaterThan(0);
  });

  it('collects lines that precede the first step marker into a synthetic Initialize Job step', async () => {
    const user = userEvent.setup();
    render(
      <DeploymentLogs
        deployment={makeDeployment({
          logs: [log('bare line with no marker', 0), log('another bare line', 1)],
        })}
      />,
    );

    expect(screen.getByText('Initialize Job')).toBeInTheDocument();
    await expandAll(user);
    expect(bodyText()).toContain('bare line with no marker');
  });

  it('treats logs with no timestamp at all without throwing', async () => {
    const user = userEvent.setup();
    render(
      <DeploymentLogs
        deployment={makeDeployment({
          logs: [
            { timestamp: '', level: 'Info', message: '=== 1_build.txt ===' },
            { timestamp: '', level: 'Info', message: 'no timestamp here' },
          ],
        })}
      />,
    );

    await expandAll(user);
    expect(bodyText()).toContain('no timestamp here');
  });

  it('renders a large log payload without dropping lines', async () => {
    const user = userEvent.setup();
    const many: DeploymentLog[] = Array.from({ length: 500 }, (_, i) =>
      log(`${T0} line-${String(i).padStart(4, '0')}`, i),
    );
    render(<DeploymentLogs deployment={makeDeployment({ logs: many })} />);
    await expandAll(user);

    expect(bodyText()).toContain('line-0000');
    expect(bodyText()).toContain('line-0499');
  });

  // ─── No-logs states ───────────────────────────────────────────────────────

  it('shows an explicit no-logs message for a succeeded deployment with no logs — collapsed by default', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ status: 'Succeeded', logs: [] })} />);

    // The step header is visible...
    expect(screen.getByText('No logs available')).toBeInTheDocument();
    // ...but its explanatory line is not rendered until the step is expanded, because the
    // fallback step id is "status" and expandedSteps is seeded with "setup-job"/"checkout".
    // KNOWN_GAP_D01: a user landing on a log-less deployment sees a collapsed accordion with
    // no explanation of why there are no logs.
    expect(bodyText()).not.toContain('No logs were captured');

    await expandAll(user);
    expect(bodyText()).toContain('No logs were captured for this deployment.');
  });

  it.each(['running', 'pending', 'in_progress', 'Running'])(
    'shows a "still running" message for status %s',
    async (status) => {
      const user = userEvent.setup();
      render(<DeploymentLogs deployment={makeDeployment({ status, logs: [] })} />);
      await expandAll(user);

      expect(screen.getByText('Deployment is running...')).toBeInTheDocument();
      expect(bodyText()).toContain('Logs are not yet available');
    },
  );

  it('shows the failure reason in the no-logs fallback for a failed deployment', async () => {
    const user = userEvent.setup();
    render(
      <DeploymentLogs
        deployment={makeDeployment({ status: 'Failed', failureReason: 'OOMKilled', logs: [] })}
      />,
    );
    await expandAll(user);

    expect(bodyText()).toContain('Deployment failed: OOMKilled');
  });

  it('falls back to triggerError when failureReason is absent', async () => {
    const user = userEvent.setup();
    render(
      <DeploymentLogs
        deployment={makeDeployment({ status: 'Failed', triggerError: 'workflow dispatch rejected', logs: [] })}
      />,
    );
    await expandAll(user);

    expect(bodyText()).toContain('Deployment failed: workflow dispatch rejected');
  });

  it('uses a generic message when a failed deployment has neither reason nor triggerError', async () => {
    const user = userEvent.setup();
    render(
      <DeploymentLogs
        deployment={makeDeployment({ status: 'Failed', failureReason: null, triggerError: null, logs: [] })}
      />,
    );
    await expandAll(user);

    expect(bodyText()).toContain('Deployment failed: Build process encountered an unexpected error');
  });

  // ─── Search ───────────────────────────────────────────────────────────────

  it('filters log lines to the search term, case-insensitively', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    await user.type(screen.getByPlaceholderText('Search logs...'), 'building');

    expect(bodyText()).toContain('Building project');
    expect(bodyText()).not.toContain('Setting up job');
  });

  it('hides steps with no matching lines while a search is active', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    await user.type(screen.getByPlaceholderText('Search logs...'), 'Building project');

    // The Build step matches; Setup and Deploy do not.
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.queryByText('Setup')).not.toBeInTheDocument();
    expect(screen.queryByText('Deploy')).not.toBeInTheDocument();
  });

  it('restores the full log when the search is cleared', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    const search = screen.getByPlaceholderText('Search logs...');
    await user.type(search, 'Building project');
    await user.clear(search);

    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(bodyText()).toContain('Setting up job');
  });

  it('renders an empty log area when the search matches nothing, with no error', async () => {
    const user = userEvent.setup();
    const { container } = render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    await user.type(screen.getByPlaceholderText('Search logs...'), 'zzzz-no-such-text');

    // Every step is filtered out. The component must not crash.
    expect(container).toBeInTheDocument();
    expect(screen.queryAllByTestId('deployment-log-line')).toHaveLength(0);
    // KNOWN_GAP_D04: there is no "no matches found" affordance, so the panel is simply blank.
  });

  // ─── Expand / collapse ────────────────────────────────────────────────────

  it('expand all reveals every log line', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);

    // KNOWN_GAP_D01: nothing is expanded on first render, because expandedSteps is seeded with
    // the ids "setup-job"/"checkout"/"build" while generated ids are "step-<index>".
    expect(screen.queryAllByTestId('deployment-log-line')).toHaveLength(0);

    await expandAll(user);
    expect(screen.getAllByTestId('deployment-log-line').length).toBeGreaterThan(0);
  });

  it('collapse all hides every log line again', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);
    expect(screen.getAllByTestId('deployment-log-line').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /collapse all/i }));

    expect(screen.queryAllByTestId('deployment-log-line')).toHaveLength(0);
  });

  it('toggling a single step header expands and collapses only that step', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    const buildHeader = screen.getByText('Build').closest('button')!;
    await user.click(buildHeader);
    // Collapsing Build hides its lines but leaves the other steps intact.
    expect(bodyText()).not.toContain('Building project');
    expect(bodyText()).toContain('Setting up job');

    await user.click(buildHeader);
    expect(bodyText()).toContain('Building project');
  });

  // ─── Timestamps toggle ────────────────────────────────────────────────────

  it('reveals per-line timestamps only after the toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    expect(screen.queryByText(/^12:00:0\d$/)).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Toggle Timestamps'));

    // Timestamps are rendered as locale time strings for lines that have one.
    expect(document.body.textContent).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  // ─── Copy ─────────────────────────────────────────────────────────────────

  it('copies every step with its header and line numbers to the clipboard', async () => {
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    const { user, writeText } = setupWithClipboardSpy();
    await expandAll(user);

    await user.click(screen.getByTitle('Copy all logs'));

    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('=== Step: Setup');
    expect(copied).toContain('=== Step: Build');
    expect(copied).toContain('Setting up job');
    expect(copied).toMatch(/\s+1\s+Setting up job/);
  });

  it('shows a Copied confirmation after copying', async () => {
    const user = userEvent.setup();
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    await expandAll(user);

    expect(screen.getByTitle('Copy all logs')).toBeInTheDocument();
    await user.click(screen.getByTitle('Copy all logs'));

    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('still reports Copied when the clipboard write is rejected — KNOWN_GAP_D08', async () => {
    render(<DeploymentLogs deployment={makeDeployment({ logs: actionsLogs })} />);
    const { user, writeText } = setupWithClipboardSpy();
    writeText.mockRejectedValueOnce(new Error('denied'));
    await expandAll(user);

    await user.click(screen.getByTitle('Copy all logs'));

    // setCopied(true) runs unconditionally, so the UI lies about a failed copy and the
    // rejected promise surfaces as an unhandled rejection.
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  // ─── Header context ───────────────────────────────────────────────────────

  it('shows the workflow file name from the deployment', () => {
    render(<DeploymentLogs deployment={makeDeployment({ workflowFile: 'release.yml', logs: [] })} />);

    expect(screen.getByText('Workflow:')).toBeInTheDocument();
    expect(bodyText()).toContain('release.yml');
  });

  it('falls back to deploy.yml when the workflow file is absent', () => {
    render(<DeploymentLogs deployment={makeDeployment({ workflowFile: null, logs: [] })} />);

    expect(screen.getAllByText('deploy.yml').length).toBeGreaterThan(0);
  });

  // ─── Rendering safety ─────────────────────────────────────────────────────

  it('renders HTML-looking log text as text rather than markup', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DeploymentLogs
        deployment={makeDeployment({
          logs: [log('=== 1_build.txt ===', 0), log('<img src=x onerror="window.__pwned=1">', 1)],
        })}
      />,
    );
    await expandAll(user);

    expect(container.querySelector('img')).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    expect(bodyText()).toContain('<img src=x onerror=');
  });

  it('handles an empty logs array without rendering a step accordion body', () => {
    render(<DeploymentLogs deployment={makeDeployment({ logs: [] })} />);

    expect(screen.getByText('No logs available')).toBeInTheDocument();
    expect(screen.queryAllByTestId('deployment-log-line')).toHaveLength(0);
  });
});