import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Copy, Globe, Activity, Terminal, Database, Settings, LayoutGrid, GitBranch, ChevronDown, X, Rocket, AlertCircle, CheckCircle } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import ServiceDeploys from './ServiceDeploys';
import ServiceLogs from './ServiceLogs';
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

function DeployModal({ service, projectId, onClose, onDeployed }: DeployModalProps) {
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
  const location = useLocation();
  const navigate = useNavigate();
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Trigger key incremented to force ServiceDeploys to re-fetch
  const [deployRefreshKey, setDeployRefreshKey] = useState(0);

  const handleDeployed = () => {
    setDeployRefreshKey((k) => k + 1);
    // Ensure we're on the deploys tab
    if (!location.pathname.includes('/deploys')) {
      navigate(`deploys`);
    }
  };

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const tabs = [
    { name: 'Deploys', path: 'deploys', icon: LayoutGrid },
    { name: 'CI History', path: 'ci-history', icon: Activity },
    { name: 'Logs', path: 'logs', icon: Terminal },
    { name: 'Metrics', path: 'metrics', icon: Activity },
    { name: 'Environment', path: 'environment', icon: Database },
    { name: 'Settings', path: 'settings', icon: Settings },
  ];

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading service...</div>;
  }

  if (!service) {
    return <div className="p-12 text-center text-red-500">Service not found.</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      {/* Deploy Modal */}
      {isDeployModalOpen && (
        <DeployModal
          service={service}
          projectId={projectId!}
          onClose={() => setIsDeployModalOpen(false)}
          onDeployed={handleDeployed}
        />
      )}

      {/* Header Area */}
      <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
        <header className="px-4 md:px-12 space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider font-mono">
            <Globe className="w-4 h-4" />
            <span>{service.type === 'web' ? 'Web Service' : service.type === 'db' ? 'Database' : 'Service'}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-y-4">
            <div className="flex-1 min-w-0">
              <h1 className="flex flex-wrap items-center gap-4 text-3xl font-medium text-gray-900 dark:text-white pr-4">
                <div className="min-w-0 break-words">{service.name}</div>
                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center px-2 py-1 text-sm font-medium border border-gray-300 dark:border-transparent bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-white rounded-sm">
                    Docker
                  </span>
                </div>
              </h1>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 text-base">
              <button className="h-10 px-4 flex items-center justify-center gap-2 border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white font-medium transition-colors rounded-sm">
                Connect
              </button>
              <button
                id="manual-deploy-btn"
                onClick={() => setIsDeployModalOpen(true)}
                className="h-10 px-4 flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#272727] dark:hover:bg-[#333] text-white font-medium border border-transparent transition-colors rounded-sm"
              >
                <Rocket className="w-4 h-4" />
                Manual Deploy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-base pb-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[15px]">
                <span className="text-gray-500 dark:text-[#8f8f8f]">Service ID:</span>
                <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                  {service.publicId || service.id}
                  <button onClick={() => copyToClipboard(service.publicId || service.id.toString())} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                </span>
              </div>
              {service.repositoryName && (
                <div className="flex items-center gap-2 text-[15px]">
                  <FaGithub className="w-4 h-4 text-gray-900 dark:text-white" />
                  <a href={service.repositoryUrl} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline flex items-center gap-1">
                    {service.repositoryName}
                  </a>
                  {service.repositoryBranch && (
                    <span className="text-gray-900 dark:text-[#f0f0f0] flex items-center gap-1 ml-2">
                      <GitBranch className="w-4 h-4 text-gray-400" />
                      {service.repositoryBranch}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-[15px]">
                <a href={`https://${service.name}.onrender.com`} target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">
                  https://{service.name}.onrender.com
                </a>
                <button onClick={() => copyToClipboard(`https://${service.name}.onrender.com`)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-6 text-sm font-medium">
            {tabs.map((tab) => {
              const isActive = location.pathname.includes(`/services/${serviceId}/${tab.path}`);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center gap-2 pb-3 border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#2563eb] text-[#2563eb] dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-[#8f8f8f] dark:hover:text-[#e3e3e3]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </header>
      </div>

      <Outlet context={{ service, deployRefreshKey }} />
    </div>
  );
}

export default function ServiceDetails() {
  return (
    <Routes>
      <Route element={<ServiceLayout />}>
        <Route index element={<Navigate to="deploys" replace />} />
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
