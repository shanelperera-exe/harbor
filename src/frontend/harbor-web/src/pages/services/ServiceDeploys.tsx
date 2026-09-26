import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext, Link, useNavigate } from 'react-router-dom';
import { Loader2, RefreshCw, Rocket, Copy, Database } from 'lucide-react';
import { format } from 'date-fns';
import { IoLogoGithub } from "react-icons/io";
import { LuExternalLink } from "react-icons/lu";
import { MdPublic } from "react-icons/md";
import { getDeploymentHistory, type Deployment } from '../../services/deploymentService';
import { DeployModal } from './ServiceDetails';
import { StatusBadge, type StatusType } from '../../components/ui/StatusBadge';

const POLL_INTERVAL_MS = 5000;

// Active states that require polling
const ACTIVE_STATUSES = new Set(['pending', 'running', 'queued']);

function isActive(status: string) {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

export const mapDeployStatus = (status: string): { type: StatusType, label: string } => {
  const s = status.toLowerCase();
  if (s === 'succeeded' || s === 'ready') return { type: 'ready', label: 'Success' };
  if (s === 'failed' || s === 'error') return { type: 'error', label: 'Failed' };
  if (s === 'running' || s === 'pending' || s === 'queued') return { type: 'running', label: 'Running' };
  return { type: 'stopped', label: status.charAt(0).toUpperCase() + status.slice(1) };
};

const getEnvironmentColor = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

function duration(deploy: Deployment): string {
  if (!deploy.completedAt || !deploy.startedAt) return '—';
  const ms = new Date(deploy.completedAt).getTime() - new Date(deploy.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}


// ─── Main Component ────────────────────────────────────────────────────────────
export default function ServiceDeploys() {
  const { projectId, serviceId } = useParams();
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deployRefreshKey = 0 } = context ?? {};
  const service = context?.service;
  const navigate = useNavigate();

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fetchDeployments = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      if (!serviceId) return;
      const result = await getDeploymentHistory({ serviceId, page: 1 });
      setDeployments(result.items);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [serviceId]);

  // Initial fetch + re-fetch when a deploy is triggered (refreshKey changes)
  useEffect(() => {
    fetchDeployments(false);
  }, [fetchDeployments, deployRefreshKey]);

  // Auto-poll when any deployment is in an active state
  useEffect(() => {
    const hasActive = deployments.some((d) => isActive(d.status));
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (hasActive) {
      pollRef.current = setInterval(() => fetchDeployments(true), POLL_INTERVAL_MS);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [deployments, fetchDeployments]);

  const filteredDeployments = deployments.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const hashStr = (d.hash || (d.publicId ? d.publicId.replace('dep-', '') : d.id.toString())).toLowerCase();
    return (
      (d.commitSha && d.commitSha.toLowerCase().includes(q)) ||
      (d.version && d.version.toLowerCase().includes(q)) ||
      (d.environment && d.environment.toLowerCase().includes(q)) ||
      hashStr.includes(q) ||
      d.status.toLowerCase().includes(q)
    );
  });


  const hasActiveDeployments = deployments.some((d) => isActive(d.status));

  return (
    <div className="flex flex-col w-full">
      {/* Deploy Modal */}
      {isDeployModalOpen && service && projectId && (
        <DeployModal
          service={service}
          projectId={projectId}
          onClose={() => setIsDeployModalOpen(false)}
          onDeployed={() => {
            fetchDeployments(true);
          }}
        />
      )}

      {/* Header Area */}
      {service && (
        <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
          <header className="px-4 md:px-12 space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider font-mono">
              {service.type === 'static' ? (
                <svg fill="currentColor" className="shrink-0 w-4 h-4" width="16" height="17" viewBox="0 0 16 17"><path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path><path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path></svg>
              ) : service.type === 'db' ? (
                <Database className="w-4 h-4" />
              ) : (
                <svg fill="currentColor" className="shrink-0 w-4 h-4" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
              )}
              <span>{service.type === 'static' ? 'Static Site' : service.type === 'web' ? 'Web Service' : service.type === 'db' ? 'Database' : 'Service'}</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-y-4">
              <div className="flex-1 min-w-0">
                <h1 className="flex flex-wrap items-center gap-4 text-3xl font-medium text-gray-900 dark:text-white pr-4">
                  <div className="min-w-0 break-words">{service.name}</div>
                </h1>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0 text-base">
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
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[15px]">
                  <span className="text-gray-500 dark:text-[#8f8f8f]">Service ID:</span>
                  <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                    {service.publicId || service.id}
                    <button onClick={() => copyToClipboard(service.publicId || service.id.toString())} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                  <span className="inline-flex items-center max-w-full">
                    <span className="translate-y-px mr-1.5 shrink-0">
                      <IoLogoGithub className="flex-shrink-0 w-5 h-5 text-gray-900 dark:text-white" aria-label="GitHub" />
                    </span>
                    <span className="group inline-flex items-center cursor-pointer no-underline min-w-0 flex-shrink text-gray-900 dark:text-white">
                      <span className="inline-flex items-center type-body-01 hover:underline max-w-full">
                        <a rel="noopener noreferrer" target="_blank" href={service.repositoryUrl || '#'}>
                          <span className="truncate min-w-0 flex-shrink">
                            {(() => {
                              const repoStr = service.repositoryName || 'portfolio';
                              const repoParts = repoStr.split('/');
                              const repoOwner = repoParts.length > 1 ? repoParts[0] : (service.repositoryOwner || 'shanelperera-exe');
                              const repoName = repoParts.length > 1 ? repoParts[1] : repoStr;
                              return `${repoOwner} / ${repoName}`;
                            })()}
                          </span>
                        </a>
                        <span className="flex items-center ml-3 mr-4">
                          {service.isPrivate ? (
                            <svg fill="currentColor" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M12 7.51172H11V4.51172C11 3.71607 10.6839 2.95301 10.1213 2.3904C9.55871 1.82779 8.79565 1.51172 8 1.51172C7.20435 1.51172 6.44129 1.82779 5.87868 2.3904C5.31607 2.95301 5 3.71607 5 4.51172V7.51172H4C3.73478 7.51172 3.48043 7.61708 3.29289 7.80461C3.10536 7.99215 3 8.2465 3 8.51172V14.5117C3 14.7769 3.10536 15.0313 3.29289 15.2188C3.48043 15.4064 3.73478 15.5117 4 15.5117H12C12.2652 15.5117 12.5196 15.4064 12.7071 15.2188C12.8946 15.0313 13 14.7769 13 14.5117V8.51172C13 8.2465 12.8946 7.99215 12.7071 7.80461C12.5196 7.61708 12.2652 7.51172 12 7.51172ZM6 4.51172C6 3.98129 6.21071 3.47258 6.58579 3.09751C6.96086 2.72243 7.46957 2.51172 8 2.51172C8.53043 2.51172 9.03914 2.72243 9.41421 3.09751C9.78929 3.47258 10 3.98129 10 4.51172V7.51172H6V4.51172ZM4 8.51172H12V14.5117H4V8.51172Z"></path></svg>
                          ) : (
                            <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 border-l border-gray-300 dark:border-[#525252] pl-4">
                          <svg fill="currentColor" aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-gray-900 dark:text-white" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 9C12.5578 9.00128 12.1285 9.14923 11.7794 9.42069C11.4303 9.69214 11.1812 10.0717 11.071 10.5H8.99998C8.60229 10.4996 8.22102 10.3414 7.93981 10.0602C7.6586 9.77897 7.50042 9.3977 7.49998 9V7C7.49808 6.45731 7.3179 5.93028 6.98718 5.5H11.071C11.1927 5.97133 11.4821 6.3821 11.885 6.65531C12.2879 6.92851 12.7766 7.0454 13.2595 6.98406C13.7424 6.92273 14.1864 6.68737 14.5081 6.32212C14.8299 5.95687 15.0075 5.48679 15.0075 5C15.0075 4.51322 14.8299 4.04314 14.5081 3.67789C14.1864 3.31264 13.7424 3.07728 13.2595 3.01595C12.7766 2.95461 12.2879 3.0715 11.885 3.3447C11.4821 3.61791 11.1927 4.02868 11.071 4.5H4.92898C4.80729 4.02868 4.51787 3.61791 4.11498 3.3447C3.71209 3.0715 3.22339 2.95461 2.74048 3.01595C2.25758 3.07728 1.81362 3.31264 1.49182 3.67789C1.17003 4.04314 0.992493 4.51322 0.992493 5C0.992493 5.48679 1.17003 5.95687 1.49182 6.32212C1.81362 6.68737 2.25758 6.92273 2.74048 6.98406C3.22339 7.0454 3.71209 6.92851 4.11498 6.65531C4.51787 6.3821 4.80729 5.97133 4.92898 5.5H4.99998C5.39768 5.50044 5.77895 5.65862 6.06016 5.93983C6.34137 6.22104 6.49955 6.60231 6.49998 7V9C6.50076 9.66281 6.76441 10.2982 7.23308 10.7669C7.70175 11.2356 8.33718 11.4992 8.99998 11.5H11.071C11.1651 11.8614 11.3587 12.1891 11.6297 12.446C11.9007 12.7029 12.2383 12.8786 12.6042 12.9532C12.9701 13.0278 13.3496 12.9984 13.6996 12.8682C14.0496 12.7379 14.356 12.5122 14.5841 12.2165C14.8123 11.9209 14.9529 11.5672 14.9901 11.1956C15.0273 10.8241 14.9595 10.4495 14.7946 10.1145C14.6296 9.77954 14.374 9.49752 14.0567 9.30051C13.7395 9.1035 13.3734 8.99939 13 9ZM13 4C13.1978 4 13.3911 4.05865 13.5556 4.16854C13.72 4.27842 13.8482 4.4346 13.9239 4.61732C13.9996 4.80005 14.0194 5.00111 13.9808 5.1951C13.9422 5.38908 13.8469 5.56726 13.7071 5.70711C13.5672 5.84696 13.3891 5.9422 13.1951 5.98079C13.0011 6.01938 12.8 5.99957 12.6173 5.92388C12.4346 5.8482 12.2784 5.72002 12.1685 5.55557C12.0586 5.39113 12 5.19779 12 5C12.0003 4.73488 12.1057 4.4807 12.2932 4.29323C12.4807 4.10576 12.7349 4.00031 13 4ZM2.99998 6C2.8022 6 2.60886 5.94136 2.44441 5.83147C2.27996 5.72159 2.15179 5.56541 2.0761 5.38269C2.00042 5.19996 1.98061 4.9989 2.0192 4.80491C2.05778 4.61093 2.15302 4.43275 2.29288 4.2929C2.43273 4.15305 2.61091 4.0578 2.80489 4.01922C2.99887 3.98063 3.19994 4.00044 3.38267 4.07613C3.56539 4.15181 3.72157 4.27999 3.83145 4.44443C3.94134 4.60888 3.99998 4.80222 3.99998 5C3.99972 5.26514 3.89428 5.51934 3.7068 5.70682C3.51932 5.8943 3.26512 5.99974 2.99998 6ZM13 12C12.8022 12 12.6089 11.9414 12.4444 11.8315C12.28 11.7216 12.1518 11.5654 12.0761 11.3827C12.0004 11.2 11.9806 10.9989 12.0192 10.8049C12.0578 10.6109 12.153 10.4328 12.2929 10.2929C12.4327 10.153 12.6109 10.0578 12.8049 10.0192C12.9989 9.98063 13.1999 10.0004 13.3827 10.0761C13.5654 10.1518 13.7216 10.28 13.8315 10.4444C13.9413 10.6089 14 10.8022 14 11C13.9996 11.2651 13.8942 11.5193 13.7067 11.7067C13.5192 11.8942 13.2651 11.9996 13 12Z"></path>
                          </svg>
                          <a rel="noopener noreferrer" target="_blank" href={`${service.repositoryUrl}/tree/${service.repositoryBranch || 'main'}`} className="hover:underline">
                            <span className="truncate min-w-0 flex-shrink" style={{ fontFamily: 'Geist, sans-serif' }}>{service.repositoryBranch || 'main'}</span>
                          </a>
                        </div>
                      </span>
                    </span>
                  </span>
                </div>
                
                {service.deploymentUrls && service.deploymentUrls.length > 0 ? (
                  <div className="flex flex-col gap-1.5 mt-2">
                    {service.deploymentUrls.map((dUrl: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                        <span>Deployment URL ({dUrl.environment}):</span>
                        <a href={dUrl.url ? (dUrl.url.startsWith('http') ? dUrl.url : `https://${dUrl.url}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          {dUrl.url || 'No URL available'}
                          <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                    <span>Deployment URL (Production):</span>
                    <a href={service.deploymentUrl ? (service.deploymentUrl.startsWith('http') ? service.deploymentUrl : `https://${service.deploymentUrl}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      {service.deploymentUrl || 'No URL available'}
                      <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>
      )}

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search deploys, commits, branches, environments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm pl-10 pr-4 text-sm font-[Geist] focus:border-[#2563eb] focus:ring-0 focus:outline-none dark:text-white transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8f8f8f]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
        <button
          onClick={() => fetchDeployments(true)}
          title="Refresh"
          className="h-10 w-10 flex items-center justify-center border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Live polling indicator */}
      {hasActiveDeployments && (
        <div className="flex items-center gap-2 text-xs text-blue-400 -mt-3">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Live — polling for updates every {POLL_INTERVAL_MS / 1000}s
        </div>
      )}

      {/* Deploys List */}
      <div>
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading deployments…</span>
            </div>
          ) : filteredDeployments.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-[#6b6b6b]">
              {search ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No matches for "{search}"</div>
                  <div className="text-xs">Try a different search term.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-[#8f8f8f]">No deployments yet</div>
                  <div className="text-xs">Click "Manual Deploy" to trigger your first deployment.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden bg-transparent">
              {/* Header */}
              <div className="flex flex-row items-center gap-8 border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02] px-4 py-3.5 text-[13px] font-medium uppercase tracking-wider font-[Geist]">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  Deployment
                  <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">
                    {filteredDeployments.length}
                  </span>
                </div>
                <div className="w-[100px] shrink-0">ID</div>
                <div className="w-[120px] shrink-0">Status</div>
                <div className="w-[120px] shrink-0">Environment</div>
                <div className="w-[100px] shrink-0">Commit</div>
                <div className="w-[140px] shrink-0">Branch</div>
                <div className="w-[120px] shrink-0 text-right">Time</div>
              </div>

              {filteredDeployments.map((deploy, index) => {
                const mappedStatus = mapDeployStatus(deploy.status);
                
                return (
                  <div 
                    key={deploy.id} 
                    onClick={() => navigate(`/projects/${projectId}/services/${serviceId}/deploymentdetails?deploymentId=${deploy.id}`)}
                    className={`group/deployment-row relative flex flex-row items-center gap-8 cursor-pointer bg-transparent transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.04] px-4 h-[56px] ${index !== filteredDeployments.length - 1 ? 'border-b border-gray-300 dark:border-[#525252]' : ''}`}
                  >

                    {/* Column 1: Deployment Name */}
                    <div className="flex-1 min-w-0 flex items-center z-20">
                      <span className="text-[14.5px] text-gray-900 dark:text-[#ededed] truncate font-[Geist] font-medium">
                        {deploy.version || 'Manual Deploy'}
                      </span>
                    </div>

                    {/* Column 2: Deployment Hash */}
                    <div className="w-[100px] shrink-0 z-20">
                      <span className="text-[14px] text-gray-900 dark:text-white font-mono truncate">
                        {deploy.hash || (deploy.publicId ? deploy.publicId.replace('dep-', '').substring(0, 9) : deploy.id)}
                      </span>
                    </div>

                    {/* Column 3: Status & Duration */}
                    <div className="w-[120px] flex items-center gap-2 shrink-0 z-20 text-[14px] font-[Geist]">
                      <StatusBadge status={mappedStatus.type} label={mappedStatus.label} />
                      <span className="text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                        {duration(deploy)}
                      </span>
                    </div>

                    {/* Column 4: Environment (Domain) */}
                    <div className="w-[120px] shrink-0 z-20">
                      <span className={`inline-flex items-center justify-center rounded-full font-[Geist] font-medium h-[24px] px-3 text-[13px] ${getEnvironmentColor(deploy.environment || 'Production')}`}>
                        <svg fill="currentColor" aria-hidden="true" className="w-3.5 h-3.5 mr-1.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                        {deploy.environment || 'Production'}
                      </span>
                    </div>

                    {/* Column 5: Commit */}
                    <div className="w-[100px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {deploy.commitSha ? (
                        <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/commit/${deploy.commitSha}` : "#"} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          </span>
                          <span className="whitespace-nowrap">{deploy.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          -
                        </span>
                      )}
                    </div>

                    {/* Column 6: Branch */}
                    <div className="w-[140px] flex items-center shrink-0 z-20 text-gray-900 dark:text-white fill-current">
                      {service.repositoryBranch ? (
                        <a href={`${service.repositoryUrl}/tree/${service.repositoryBranch}`} onClick={(e) => e.stopPropagation()} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1.5 text-[14px] font-mono truncate hover:underline cursor-pointer">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="flex-none" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
                          {service.repositoryBranch}
                        </a>
                      ) : (
                        <span className="text-[14px] font-mono text-gray-900 dark:text-white">-</span>
                      )}
                    </div>

                    {/* Column 7: Date and Time */}
                    <div className="w-[120px] shrink-0 z-20 text-[14px] text-gray-900 dark:text-white font-[Geist] text-right whitespace-nowrap">
                      {format(new Date(deploy.startedAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
