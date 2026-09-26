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
    { name: 'Deployments', path: 'deploys', icon: LayoutGrid },
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

          <div className="grid grid-cols-1 gap-4 pt-2 text-base pb-6">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-2 text-[15px]">
                <span className="text-gray-500 dark:text-[#8f8f8f]">Service ID:</span>
                <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                  {service.publicId || service.id}
                  <button onClick={() => copyToClipboard(service.publicId || service.id.toString())} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                </span>
              </div>
              
              <div className="relative flex min-w-px max-w-full flex-1 flex-col items-stretch justify-start pt-2">
                <div className="flex flex-col gap-[23px]">
                  <div className="flex flex-row items-center justify-start flex-none">
                    <div className="max-w-full mx-auto w-[calc(100vw-(100vw-100%))] px-0 min-w-0">
                      <dl className="m-0 [&>dd>span]:flex [&>dd>span]:overflow-hidden [&>dd>span_a]:inline-block [&>dd>span_a]:truncate" data-version="v1">
                        <dt className="text-sm !leading-[14px] min-h-[14px] capitalize whitespace-nowrap text-[#8f8f8f] mb-2" data-geist-description-title="">Deployment</dt>
                        <dd className="text-sm text-gray-900 dark:text-white !leading-4 font-medium" data-geist-description-content="">
                          <span className="display-[inherit] box-sizing-[initial] animate-partial-fade-in">
                            <a data-zone="same" className="cursor-pointer focus-visible:outline-2 outline-blue-500 outline-offset-4 font-medium text-gray-900 dark:text-white no-underline hover:underline" href={`https://${service.name}.onrender.com`}>
                              {service.name}-698ml64dl-shanelperera-exes-projects.vercel.app
                            </a>
                          </span>
                        </dd>
                      </dl>
                    </div>
                    {/* Speed Insights circle */}
                    <div className="flex flex-row items-center justify-start gap-2 flex-initial" style={{ marginLeft: '8px', marginRight: '8px' }}>
                      <a data-zone="same" className="cursor-pointer focus-visible:outline-2 outline-blue-500 outline-offset-4" href="#" style={{ display: 'flex' }}>
                        <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                          <div aria-valuemax={100} aria-valuemin={0} aria-valuenow={0} className="relative flex flex-col justify-center items-center [&_svg]:overflow-visible [--transition-length:1s] [--transition-step:200ms] [--delay:0s] [--percent-to-deg:3.6deg] transform-gpu" data-geist-progress-circle="" data-version="v1" role="progressbar" style={{ '--circle-size': '100px', '--circumference': '282.7433388230814', '--percent-to-px': '2.827433388230814px', '--gap-percent': '0', '--offset-factor': '0' } as any}>
                            <svg aria-hidden="true" fill="none" height="32" strokeWidth="2" viewBox="0 0 100 100" width="32">
                              <circle cx="50" cy="50" r="45" strokeWidth="10" strokeDashoffset="0" strokeLinecap="round" strokeLinejoin="round" className="[--offset-factor-secondary:calc(1-var(--offset-factor))] [stroke-dasharray:calc(var(--stroke-percent)*var(--percent-to-px))_var(--circumference)] [transform:rotate(calc(360deg-90deg-(var(--gap-percent)*var(--percent-to-deg)*var(--offset-factor-secondary))))_scaleY(-1)] [transform-origin:calc(var(--circle-size)/2)_calc(var(--circle-size)/2)] [transition:all_var(--transition-length)_ease_var(--delay)]" stroke="#333" style={{ opacity: 1, '--stroke-percent': '99' } as any}></circle>
                              <circle cx="50" cy="50" r="45" strokeWidth="10" strokeDashoffset="0" strokeLinecap="round" strokeLinejoin="round" className="[stroke-dasharray:calc(var(--stroke-percent)*var(--percent-to-px))_var(--circumference)] [transition-property:stroke-dasharray,transform] [transition:var(--transition-length)_ease_var(--delay),stroke_var(--transition-length)_ease_var(--delay)] [transform:rotate(calc(-90deg+var(--gap-percent)*var(--offset-factor)*var(--percent-to-deg)))] [transform-origin:calc(var(--circle-size)/2)_calc(var(--circle-size)/2)]" data-geist-progress-circle-fg="" stroke="#ff4e42" style={{ opacity: 0, '--stroke-percent': '0' } as any}></circle>
                            </svg>
                            <div aria-hidden="true" className="flex absolute">
                              <span className="flex text-[11px] font-medium leading-[0.75rem] text-gray-900 dark:text-white">
                                <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                  <path fill="currentColor" fillRule="evenodd" d="M5.51 3.62 3.76 8.35a1 1 0 0 1-.93.65H0V7.5h2.48l2.09-5.64a1 1 0 0 1 1.87-.01l4.07 10.6 1.73-4.32a1 1 0 0 1 .93-.63H16V9h-2.49l-2.08 5.19a1 1 0 0 1-1.86-.02z" clipRule="evenodd"></path>
                                </svg>
                              </span>
                            </div>
                          </div>
                        </span>
                      </a>
                    </div>
                  </div>
                  
                  <div className="max-w-full mx-auto w-[calc(100vw-(100vw-100%))] px-0">
                    <dl className="m-0" data-version="v1">
                      <dt className="text-sm !leading-[14px] min-h-[14px] capitalize whitespace-nowrap text-[#8f8f8f] mb-2" data-geist-description-title="">
                        <div className="max-w-full mx-auto w-[calc(100vw-(100vw-100%))] px-0">
                          <div className="flex gap-2 items-center">
                            Domains
                            <button type="button" aria-label="Add a domain" className="flex items-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                              <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" data-glyph="circular" className="cursor-pointer" style={{ color: 'currentcolor' }}>
                                <path fill="currentColor" fillRule="evenodd" d="M14.5 8a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.75 4.25v3h3v1.5h-3v3h-1.5v-3h-3v-1.5h3v-3z" clipRule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </dt>
                      <dd className="text-sm text-gray-900 dark:text-white !leading-4 font-medium" data-geist-description-content="">
                        <span className="display-[inherit] box-sizing-[initial] animate-partial-fade-in">
                          <span className="text-[14px] leading-[20px] font-medium undefined">
                            <div className="flex flex-row items-stretch justify-start gap-2 flex-initial max-w-full">
                              <a href={`https://${service.name}.onrender.com`} rel="noopener" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-blue-500 outline-offset-4 inline-flex items-center gap-0.5 pt-px leading-[16px] hover:underline" style={{ minWidth: '0px', maxWidth: '100%' }}>
                                <span className="geist-ellipsis">{service.name}.onrender.com</span>
                                <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                  <path fill="currentColor" fillRule="evenodd" d="M11.5 9.75v1.5q-.02.23-.25.25h-6.5a.25.25 0 0 1-.25-.25v-6.5c0-.14.11-.25.25-.25H7V3H4.75C3.78 3 3 3.78 3 4.75v6.5c0 .97.78 1.75 1.75 1.75h6.5c.97 0 1.75-.78 1.75-1.75V9h-1.5zM8.5 3h3.75c.41 0 .75.34.75.75V7.5h-1.5V5.56L8.53 8.53 8 9.06 6.94 8l.53-.53 2.97-2.97H8.5z" clipRule="evenodd"></path>
                                </svg>
                              </a>
                            </div>
                          </span>
                        </span>
                      </dd>
                    </dl>
                  </div>
                  
                  <div className="relative block min-w-px max-w-full flex-[0_1_auto] items-stretch justify-start sm:flex sm:flex-row lg:flex-wrap gap-8">
                    <dl className="m-0" data-version="v1">
                      <dt className="text-sm !leading-[14px] min-h-[14px] capitalize whitespace-nowrap text-[#8f8f8f] mb-2" data-geist-description-title="">Status</dt>
                      <dd className="text-sm text-gray-900 dark:text-white !leading-4 font-medium" data-geist-description-content="">
                        <span className="display-[inherit] box-sizing-[initial] animate-partial-fade-in">
                          <div className="relative flex h-[22px] min-w-px max-w-full flex-row items-center lg:flex-wrap">
                            <div className="flex gap-2 whitespace-nowrap *:text-ellipsis text-[14px] h-5 items-center -ml-[3px]" aria-label="This deployment is ready." data-testid="deployment/status">
                              <span className="flex items-center gap-1">
                                <span className="w-4 h-4 flex items-center justify-center">
                                  <span data-glyph="circular" className="w-2.5 h-2.5 flex-none rounded-full shrink-0 bg-[#50e3c2]"></span>
                                </span>
                                <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                                  <span className="text-[14px]" style={{ fontWeight: 500 }}>Ready</span>
                                </span>
                              </span>
                            </div>
                          </div>
                        </span>
                      </dd>
                    </dl>
                    
                    <dl className="m-0" data-version="v1">
                      <dt className="text-sm !leading-[14px] min-h-[14px] capitalize whitespace-nowrap text-[#8f8f8f] mb-2" data-geist-description-title="">Created</dt>
                      <dd className="text-sm text-gray-900 dark:text-white !leading-4 font-medium" data-geist-description-content="">
                        <span className="display-[inherit] box-sizing-[initial] animate-partial-fade-in">
                          <div className="flex items-center gap-[0.4rem] inline-flex cursor-pointer flex-[0_1_auto] overflow-hidden">
                            <p className="text-[14px] inline-block truncate">Sep 22 by shanelperera-exe</p>
                            <div className="relative w-[22px] h-[22px] shrink-0">
                              <span aria-label="github/shanelperera-exe" className="w-[22px] h-[22px] shrink-0 rounded-full inline-block overflow-hidden leading-0 align-top relative transition-[background] duration-200 ease-in-out" data-geist-avatar="" data-mask="true" data-resolved="true" data-version="v1" role="img">
                                <img data-version="v1" alt="github/shanelperera-exe" title="github/shanelperera-exe" loading="eager" width="22" height="22" decoding="sync" className="h-auto max-w-full w-full h-full relative" src="https://avatars.githubusercontent.com/shanelperera-exe?s=44" />
                              </span>
                            </div>
                          </div>
                        </span>
                      </dd>
                    </dl>
                  </div>
                  
                  <div className="max-w-full mx-auto w-[calc(100vw-(100vw-100%))] px-0">
                    <dl className="m-0" data-version="v1">
                      <dt className="text-sm !leading-[14px] min-h-[14px] capitalize whitespace-nowrap text-[#8f8f8f] mb-2" data-geist-description-title="">Source</dt>
                      <dd className="text-sm text-gray-900 dark:text-white !leading-4 font-medium" data-geist-description-content="">
                        <span className="display-[inherit] box-sizing-[initial] animate-partial-fade-in">
                          <div className="flex flex-col items-stretch justify-start flex-initial min-h-[44px] w-full text-gray-900 dark:text-white">
                            <div className="flex items-center justify-start flex-nowrap gap-1 h-[22px] transition-all duration-300">
                              <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="flex-none text-gray-400" style={{ color: 'currentcolor' }}>
                                <path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path>
                              </svg>
                              <a href={service.repositoryUrl || "#"} rel="noopener" target="_blank" title="Git Branch" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-blue-500 outline-offset-4 z-2 flex shrink gap-2 truncate">
                                <code className="text-[13.5px] leading-[18px] empty:hidden truncate font-mono text-gray-900 dark:text-white" data-geist-inline-code="" data-version="v1">{service.repositoryBranch || 'main'}</code>
                              </a>
                            </div>
                            <div className="flex items-center justify-start flex-nowrap gap-1 h-[22px] transition-all duration-300">
                              <span className="inline-flex h-fit items-center flex-none" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                                <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="text-gray-400" style={{ color: 'currentcolor' }}>
                                  <path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path>
                                </svg>
                              </span>
                              <a href="#" rel="noopener" target="_blank" title="Git Commit" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-blue-500 outline-offset-4 z-[2] flex shrink items-center gap-1.5 truncate text-gray-900 dark:text-white">
                                <code className="max-w-full text-[13.5px] leading-[18px] empty:hidden font-mono" data-geist-inline-code="" data-version="v1">b50e8a2</code>
                                <span className="inline-flex h-fit items-center flex-none" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                                  <svg viewBox="0 0 16 16" height="14" width="14" data-slot="geist-icon" className="text-gray-900 dark:text-white" style={{ color: 'currentcolor' }}>
                                    <path fill="currentColor" d="M8 0a1 1 0 0 1 .7.29l1.76 1.76h2.5a1 1 0 0 1 .99 1v2.49L15.7 7.3a1 1 0 0 1 0 1.4l-1.76 1.76v2.5a1 1 0 0 1-1 .99h-2.49L8.7 15.7a1 1 0 0 1-1.4 0l-1.76-1.76h-2.5a1 1 0 0 1-.99-1v-2.49L.3 8.7a1 1 0 0 1 0-1.4l1.76-1.76v-2.5a1 1 0 0 1 1-.99h2.49L7.3.3A1 1 0 0 1 8 0M6.6 3.11l-.44.44h-2.6v2.6L1.7 8l1.84 1.84v2.6h2.6l.45.45 1.4 1.4 1.4-1.4.44-.44h2.6v-2.6l.45-.45 1.4-1.4-1.84-1.84v-2.6h-2.6L8 1.7zm4.59 3.3-3.72 3.71c-.3.3-.77.3-1.06 0L4.8 8.53l1.07-1.06 1.06 1.06 3.18-3.18z"></path>
                                  </svg>
                                </span>
                                <span className="truncate text-[14px] font-normal leading-[1.3] text-gray-500 dark:text-[#a1a1aa] hover:underline" title="Merge pull request #15 from shanelperera-exe/test">Merge pull request #15 from shanelperera-exe/test</span>
                              </a>
                            </div>
                          </div>
                        </span>
                      </dd>
                    </dl>
                  </div>
                </div>
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
