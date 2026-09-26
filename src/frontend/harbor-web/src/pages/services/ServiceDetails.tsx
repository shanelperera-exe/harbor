import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { GitBranch, ChevronDown, AlertCircle, CheckCircle, Rocket, Globe, X } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import ServiceDeploys from './ServiceDeploys';
import ServiceLogs from './ServiceLogs';
import DeploymentDetails from './DeploymentDetails';
import ServiceMetrics from './ServiceMetrics';
import ServiceEnvironment from './ServiceEnvironment';
import ServiceSettings from './ServiceSettings';
import ServiceCiRuns from './ServiceCiRuns';
import { createDeployment, CiGateError } from '../../services/deploymentService';
import { getEnvironments, type DeploymentEnvironment } from '../../services/environmentService';

// ─── Deploy Modal ────────────────────────────────────────────────────────────
interface DeployModalProps {
  service: any;
  projectId: string;
  onClose: () => void;
  onDeployed: () => void;
}

export function DeployModal({ service, projectId, onClose, onDeployed }: DeployModalProps) {
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('');
  const [branch, setBranch] = useState(service?.repositoryBranch || 'main');
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ciWarning, setCiWarning] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

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
      const result = await createDeployment({
        serviceId: service.publicId || service.id.toString(),
        environment: selectedEnv,
        version: branch.trim(),
        branch: branch.trim(),
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-md mx-4 bg-[#0d0d0d] border border-[#3a3a3a] rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-4 h-4 text-[#3b82f6]" />
            <h2 className="text-[15px] font-semibold text-white">Manual Deploy</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#6b6b6b] hover:text-white transition-colors rounded-sm p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Service info */}
          <div className="flex items-center gap-2 p-3 bg-[#141414] border border-[#2a2a2a] rounded-md">
            <div className="w-7 h-7 rounded-sm bg-[#1e3a5f] flex items-center justify-center flex-shrink-0">
              <Globe className="w-3.5 h-3.5 text-[#3b82f6]" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{service?.name}</div>
              {service?.repositoryName && (
                <div className="text-xs text-[#6b6b6b] flex items-center gap-1 truncate">
                  <FaGithub className="w-3 h-3 flex-shrink-0" />
                  {service.repositoryName}
                </div>
              )}
            </div>
          </div>

          {/* Environment selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8f8f8f] uppercase tracking-wider">
              Environment
            </label>
            {environments.length === 0 && !error ? (
              <div className="h-9 flex items-center px-3 bg-[#141414] border border-[#2a2a2a] rounded-md text-sm text-[#6b6b6b]">
                Loading environments…
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value)}
                  className="w-full h-9 appearance-none bg-[#141414] border border-[#2a2a2a] hover:border-[#3a3a3a] focus:border-[#3b82f6] focus:outline-none rounded-md px-3 pr-8 text-sm text-white transition-colors"
                >
                  {environments.map((env) => (
                    <option key={env.id} value={env.name} className="bg-[#141414]">
                      {env.name} ({env.type})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b6b] pointer-events-none" />
              </div>
            )}
          </div>

          {/* Branch / commit SHA */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8f8f8f] uppercase tracking-wider">
              Branch or Commit SHA
            </label>
            <div className="relative">
              <GitBranch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b6b6b]" />
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main, feat/..., or a40f3c2"
                className="w-full h-9 bg-[#141414] border border-[#2a2a2a] hover:border-[#3a3a3a] focus:border-[#3b82f6] focus:outline-none rounded-md pl-8 pr-3 text-sm text-white placeholder:text-[#4a4a4a] transition-colors font-mono"
              />
            </div>
            <p className="text-[11px] text-[#555]">
              GitHub Actions will check out this ref when running the workflow.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-md text-sm text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* CI Gate Warning */}
          {ciWarning && (
            <div className="p-3 bg-amber-950/40 border border-amber-700/50 rounded-md text-sm text-amber-300 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200 mb-0.5">CI checks are failing</div>
                  <div className="text-xs text-amber-400">{ciWarning}</div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setCiWarning(null)}
                  className="h-7 px-3 text-xs text-amber-400 hover:text-amber-200 border border-amber-700/50 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeploy(true)}
                  disabled={deploying}
                  className="h-7 px-3 text-xs font-medium bg-amber-700 hover:bg-amber-600 text-white rounded-md transition-colors"
                >
                  Deploy anyway
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-md text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Deployment triggered successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-[#2a2a2a] bg-[#0a0a0a]">
          <button
            onClick={onClose}
            className="h-8 px-3.5 text-sm font-medium text-[#8f8f8f] hover:text-white border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleDeploy(false)}
            disabled={deploying || success || environments.length === 0}
            className="h-8 px-4 flex items-center gap-2 text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] disabled:bg-[#1a2d4a] disabled:text-[#4a6fa5] text-white rounded-md transition-colors"
          >
            {deploying ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Triggering…
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Triggered!
              </>
            ) : (
              <>
                <Rocket className="w-3.5 h-3.5" />
                Deploy
              </>
            )}
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
         <Route path="deploymentdetails" element={<DeploymentDetails />} />
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
