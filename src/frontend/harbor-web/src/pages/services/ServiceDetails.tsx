import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { MdFiberNew } from 'react-icons/md';
import { BiSolidBolt } from 'react-icons/bi';

import ServiceDeploys from './ServiceDeploys';
import ServiceLogs from './ServiceLogs';
import DeploymentDetails from './DeploymentDetails';
import ServiceMetrics from './ServiceMetrics';
import ServiceEnvironment from './ServiceEnvironment';
import ServiceSettings from './ServiceSettings';
import ServiceCiRuns from './ServiceCiRuns';
import { createDeployment, CiGateError } from '../../services/deploymentService';
import { getEnvironments, type DeploymentEnvironment } from '../../services/environmentService';
import { Icon } from '../../components/icons';

// ─── Deploy Modal ────────────────────────────────────────────────────────────
interface DeployModalProps {
  service: any;
  projectId: string;
  onClose: () => void;
  onDeployed: () => void;
  mode?: 'latest' | 'specific';
  latestCommitSha?: string;
}

export function DeployModal({ service, projectId, onClose, onDeployed, mode = 'latest', latestCommitSha }: DeployModalProps) {
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('');
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [branch, setBranch] = useState(mode === 'specific' ? '' : (service?.repositoryBranch || 'main'));
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ciWarning, setCiWarning] = useState<string | null>(null);
  const [actualLatestCommit, setActualLatestCommit] = useState<{sha: string, message: string} | null>(null);
  const [commitsList, setCommitsList] = useState<{sha: string, message: string}[]>([]);
  const [commitDropdownOpen, setCommitDropdownOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (service?.repositoryName) {
      const fetchCommits = async () => {
        try {
          const [owner, repo] = service.repositoryName.split('/');
          const targetBranch = service?.repositoryBranch || 'main';
          const token = localStorage.getItem('harbor_token');
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
          const res = await fetch(`${apiBaseUrl}/projects/githubintegration/repositories/${owner}/${repo}/branches/${targetBranch}/commits`, {
             headers: { 
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'ngrok-skip-browser-warning': 'true'
             }
          });
          if (res.ok) {
             const data = await res.json();
             if (data.data && Array.isArray(data.data)) {
                setCommitsList(data.data);
                if (data.data.length > 0) {
                   setActualLatestCommit({ sha: data.data[0].sha, message: data.data[0].message });
                }
             }
          }
        } catch (e) {
          console.error('Failed to fetch commits', e);
        }
      };
      fetchCommits();
    }
  }, [service]);


  useEffect(() => {
    getEnvironments(projectId)
      .then((envs) => {
        const active = envs.filter((e) => e.isActive);
        setEnvironments(active);
        if (active.length > 0) setSelectedEnv(active[0].name);
      })
      .catch(() => setError('Could not load environments.'));
  }, [projectId]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDeploy = async (overrideCiGate = false) => {
    if (!selectedEnv || !branch.trim()) {
      setError('Please select an environment and specify a branch or commit.');
      return;
    }
    setDeploying(true);
    setError('');
    setCiWarning(null);
    try {
      const isLatest = mode === 'latest';
      const cSha = isLatest ? actualLatestCommit?.sha : branch.trim();
      const cMsg = isLatest 
        ? actualLatestCommit?.message 
        : commitsList.find(c => c.sha === branch.trim())?.message;

      const result = await createDeployment({
        serviceId: service.publicId || service.id.toString(),
        environment: selectedEnv,
        version: isLatest ? service?.repositoryBranch || 'main' : cSha,
        branch: service?.repositoryBranch || 'main',
        commitSha: cSha,
        commitMessage: cMsg,
        overrideCiGate,
      });
      // 502-equivalent: deployment record created but GitHub rejected the trigger
      if (result.status === 'Failed') {
        const triggerErr = (result as any).failureReason || 'GitHub rejected the workflow trigger.';
        setError(`Deployment created but GitHub could not start the workflow: ${triggerErr}`);
        setTimeout(() => onDeployed(), 500);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onDeployed();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof CiGateError) {
        // CI gate blocked — show warning with "Deploy anyway?" option
        setCiWarning(err.message);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="inline-block w-full text-left align-middle transform bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] max-w-lg rounded-sm">
        {/* Header */}
        <div className="flex flex-col gap-2 items-start border-b border-[#4d4d4d] p-6 relative">
          <div className="w-full pr-8 flex items-center gap-3">
            {mode === 'latest' ? (
              <MdFiberNew className="w-7 h-7 text-white" />
            ) : (
              <Icon name="gitBranch" className="flex-none text-white" style={{ color: 'currentColor' }} data-slot="geist-icon" width="24" height="24" />
            )}
            <h1 className="text-[24px] font-medium text-white">{mode === 'latest' ? 'Deploy latest commit' : 'Deploy a specific commit'}</h1>
          </div>
          <button 
            className="flex p-1.5 text-[#e3e3e3] hover:text-white hover:bg-[#ffffff1a] transition-colors rounded-sm absolute right-4 top-4" 
            type="button" 
            aria-label="Close modal"
            onClick={onClose}
          >
            <Icon name="close" aria-hidden="true" width="16" height="16" />
          </button>
        </div>

        {/* Body */}
        <div className="text-[16px] text-[#f0f0f0] p-6 space-y-6">
          {/* Service info */}
          <div className="flex items-center gap-2 p-3 bg-transparent border border-[#6b6b6b] rounded-sm">
            <div className="w-8 h-8 rounded-sm bg-transparent border border-[#6b6b6b] flex items-center justify-center flex-shrink-0 text-white">
              <Icon name="projects" className="flex-shrink-0 w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-white truncate">{service?.name}</div>
              {service?.repositoryName && (
                <div className="text-[13px] text-[#8f8f8f] flex items-center gap-1 truncate">
                  <FaGithub className="w-3.5 h-3.5 flex-shrink-0" />
                  {service.repositoryName}
                </div>
              )}
            </div>
          </div>

          {/* Environment selector */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Environment
            </label>
            {environments.length === 0 && !error ? (
              <div className="h-10 flex items-center px-3 bg-transparent border border-[#6b6b6b] rounded-sm text-[15px] text-[#8f8f8f]">
                Loading environments…
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
                  className="h-10 w-full flex items-center justify-between px-3 bg-transparent border border-[#6b6b6b] hover:border-[#b3b3b3] focus:border-[#2563eb] text-[#f0f0f0] transition-colors rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selEnvObj = environments.find(e => e.name === selectedEnv);
                      const type = selEnvObj ? selEnvObj.type.toLowerCase() : '';
                      if (type === 'production') return <BiSolidBolt className="w-4 h-4 shrink-0 text-[#f0f0f0]" />;
                      return <Icon name="environmentBurst" className="w-4 h-4 shrink-0 text-[#f0f0f0]" aria-hidden="true" />;
                    })()}
                    <span>{selectedEnv || 'Select environment'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#8f8f8f]" />
                </button>

                {envDropdownOpen && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] rounded-sm z-[100] shadow-xl max-h-60 overflow-y-auto">
                    {environments.map(env => {
                      const type = env.type.toLowerCase();
                      const isProduction = type === 'production';
                      return (
                        <li 
                          key={env.id}
                          onClick={() => { setSelectedEnv(env.name); setEnvDropdownOpen(false); }} 
                          className="px-3 py-2 hover:bg-[#ffffff1a] cursor-pointer flex items-center gap-2 text-[#f0f0f0] transition-colors"
                        >
                          {isProduction ? (
                            <BiSolidBolt className="w-4 h-4 shrink-0 text-[#f0f0f0]" />
                          ) : (
                            <Icon name="environmentBurst" className="w-4 h-4 shrink-0 text-[#f0f0f0]" aria-hidden="true" />
                          )}
                          {env.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Branch */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Branch
            </label>
            <div className="relative flex">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                <Icon name="gitBranch" className="text-[#8f8f8f]" style={{ color: 'currentColor' }} data-slot="geist-icon" />
              </div>
              <input
                type="text"
                value={service?.repositoryBranch || 'main'}
                disabled
                className="h-10 truncate w-full m-0 py-2.5 pl-9 pr-3 bg-[#111111] border border-[#4d4d4d] outline-none text-[#8f8f8f] text-[16px] transition-colors rounded-sm font-mono cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          {/* Commit SHA */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Commit
            </label>
            <div className="relative flex">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                <Icon name="gitCommit" className="text-[#8f8f8f]" style={{ color: 'currentColor' }} data-slot="geist-icon" />
              </div>
              <input
                type="text"
                value={mode === 'latest' ? (
                  actualLatestCommit 
                    ? `${actualLatestCommit.message.split('\n')[0]} (${actualLatestCommit.sha.substring(0, 7)})` 
                    : (latestCommitSha || service?.repositoryCommit ? `Latest commit (${(latestCommitSha || service?.repositoryCommit || '').substring(0, 7)})` : 'Latest commit')
                ) : branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setCommitDropdownOpen(true);
                }}
                onFocus={() => mode === 'specific' && setCommitDropdownOpen(true)}
                disabled={mode === 'latest'}
                placeholder={mode === 'latest' ? 'Latest commit' : "e.g. a40f3c2"}
                className="h-10 truncate w-full m-0 py-2.5 pl-9 pr-3 bg-transparent border border-[#6b6b6b] hover:border-[#b3b3b3] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none text-[#f0f0f0] text-[16px] placeholder:text-[#8f8f8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-mono"
              />
              {mode === 'specific' && commitDropdownOpen && commitsList.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] rounded-sm z-[100] shadow-xl max-h-60 overflow-y-auto">
                  {commitsList
                    .filter(c => c.sha.startsWith(branch) || c.message.toLowerCase().includes(branch.toLowerCase()))
                    .map(commit => (
                    <li 
                      key={commit.sha}
                      onClick={() => { setBranch(commit.sha); setCommitDropdownOpen(false); }} 
                      className="px-3 py-2 hover:bg-[#ffffff1a] cursor-pointer flex items-center gap-2 text-[#f0f0f0] transition-colors border-b border-[#4d4d4d]/50 last:border-0"
                    >
                      <Icon name="gitCommit" className="text-[#8f8f8f] shrink-0" style={{ color: 'currentColor' }} data-slot="geist-icon" />
                      <div className="flex flex-col gap-0.5 truncate overflow-hidden w-full font-geist-mono">
                        <span className="text-[14px] truncate">{commit.message.split('\n')[0]}</span>
                        <span className="text-[12px] text-[#8f8f8f]">{commit.sha.substring(0, 7)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 text-[13px] text-[#8f8f8f]">
              {mode === 'latest' 
                ? 'Deploying the latest commit from this branch.' 
                : 'GitHub Actions will check out this specific ref when running the workflow.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-sm text-[15px] text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* CI Gate Warning */}
          {ciWarning && (
            <div className="p-4 bg-amber-950/40 border border-amber-700/50 rounded-sm text-[15px] text-amber-300 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200 mb-1">CI checks are failing</div>
                  <div className="text-[14px] text-amber-400">{ciWarning}</div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={() => setCiWarning(null)}
                  className="h-9 px-4 text-[14px] text-amber-400 hover:text-amber-200 border border-amber-700/50 hover:bg-amber-900/30 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeploy(true)}
                  disabled={deploying}
                  className="h-9 px-4 text-[14px] font-medium bg-amber-700 hover:bg-amber-600 text-white rounded-sm transition-colors"
                >
                  Deploy anyway
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-sm text-[15px] text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Deployment triggered successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="w-full flex justify-start space-x-3 p-6 border-t border-[#4d4d4d] bg-[oklch(0.21_0.03_263.45)]">
          <button
            onClick={() => handleDeploy(false)}
            disabled={deploying || success || environments.length === 0}
            className="h-10 py-2.5 px-4 bg-white text-black hover:bg-[#2563eb] hover:text-white disabled:bg-[#272727] disabled:text-[#4d4d4d] disabled:cursor-not-allowed font-medium text-[15px] transition-colors flex items-center gap-2 rounded-sm"
          >
            {deploying ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Triggering...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Triggered!
              </>
            ) : (
              <>
                Deploy
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="h-10 py-2.5 px-4 border border-[#fff6] text-[#e3e3e3] hover:bg-[#ffffff1a] hover:text-white disabled:opacity-50 font-medium text-[15px] transition-colors flex items-center rounded-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Layout ───────────────────────────────────────────────────────────
function ServiceLayout() {
  const { projectId, serviceId } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const deployRefreshKey = 0;

  useEffect(() => {
    const fetchService = async () => {
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (res.ok) {
          const json = await res.json();
          setService(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch service:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [projectId, serviceId]);




  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading service...</div>;
  }

  if (!service) {
    return <div className="p-12 text-center text-red-500">Service not found.</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <Outlet context={{ service, deployRefreshKey }} />
    </div>
  );
}

export default function ServiceDetails() {
  return (
    <Routes>
      <Route element={<ServiceLayout />}>
        <Route index element={<Navigate to="deploys" replace />} />
         <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
         <Route path="deploys" element={<ServiceDeploys />} />
         <Route path="ci-history" element={<ServiceCiRuns />} />
         <Route path="logs" element={<ServiceLogs />} />
        <Route path="metrics" element={<ServiceMetrics />} />
        <Route path="environment" element={<ServiceEnvironment />} />
        <Route path="settings" element={<ServiceSettings />} />
      </Route>
    </Routes>
  );
}
