import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { Copy, Database } from 'lucide-react';
import { IoLogoGithub } from "react-icons/io";
import { LuExternalLink } from "react-icons/lu";
import { MdPublic } from "react-icons/md";
import { BiSolidBolt } from "react-icons/bi";
import { FiChevronDown } from 'react-icons/fi';
import { motion } from 'motion/react';
import { MdFiberNew } from 'react-icons/md';
import { getDeploymentHistory, type Deployment, mapDeployStatus } from '../../services/deploymentService';
import { DeployModal } from './ServiceDetails';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Icon } from '../../components/icons';

const getEnvironmentColor = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'bg-[#0070f3] text-white';
  if (e === 'preview' || e === 'staging') return 'bg-[#7928ca] text-white';
  if (e === 'development') return 'bg-[#000] text-white dark:bg-[#fff] dark:text-[#000] ring-1 ring-inset ring-gray-200 dark:ring-[#333]';
  return 'bg-gray-500 text-white';
};

interface ServiceHeaderProps {
  onDeployed?: () => void;
}

export default function ServiceHeader({ onDeployed }: ServiceHeaderProps) {
  const { projectId, serviceId } = useParams();
  const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deployRefreshKey = 0 } = context ?? {};
  const service = context?.service;

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployMenuOpen, setDeployMenuOpen] = useState(false);
  const [deployMode, setDeployMode] = useState<'latest' | 'specific'>('latest');
  const [latestDeployed, setLatestDeployed] = useState<Deployment | null>(null);
  const deployMenuRef = useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const fetchLatestDeployment = useCallback(async () => {
    if (!serviceId) return;
    try {
      const result = await getDeploymentHistory({ serviceId, page: 1, pageSize: 100 });
      const latest = [...result.items]
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .find((d) => d.status?.toLowerCase() === 'succeeded') || null;
      setLatestDeployed(latest);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchLatestDeployment();
  }, [fetchLatestDeployment, deployRefreshKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deployMenuRef.current && !deployMenuRef.current.contains(event.target as Node)) {
        setDeployMenuOpen(false);
      }
    };
    if (deployMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [deployMenuOpen]);

  const deployedBranch = latestDeployed?.workflowRef || service?.repositoryBranch || 'main';
  const deployedCommitSha = latestDeployed?.commitSha || null;

  const handleDeployed = () => {
    fetchLatestDeployment();
    onDeployed?.();
  };

  if (!service) return null;

  return (
    <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
      <header className="px-4 md:px-12 space-y-4">
        {/* Deploy Modal */}
        {isDeployModalOpen && service && projectId && (
          <DeployModal
            service={service}
            projectId={projectId}
            mode={deployMode}
            latestCommitSha={latestDeployed?.commitSha || undefined}
            onClose={() => setIsDeployModalOpen(false)}
            onDeployed={handleDeployed}
          />
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider font-mono">
          {service.type === 'static' ? (
            <Icon name="staticSite" className="shrink-0 w-4 h-4" />
          ) : service.type === 'db' ? (
            <Database className="w-4 h-4" />
          ) : (
            <Icon name="globe" className="shrink-0 w-4 h-4" />
          )}
          <span>{service.type === 'static' ? 'Static Site' : service.type === 'web' ? 'Web Service' : service.type === 'db' ? 'Database' : 'Service'}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-y-4">
          <div className="flex-1 min-w-0">
            <h1 className="flex flex-wrap items-center gap-4 text-5xl font-medium text-gray-900 dark:text-white pr-4">
              <div className="min-w-0 break-words">
                {service?.name && !service.name.startsWith('srv-') ? service.name : 'portfolio'}
              </div>
            </h1>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0 text-base" ref={deployMenuRef}>
            <div className="relative inline-block text-left z-[100]">
              <button
                onClick={() => setDeployMenuOpen(!deployMenuOpen)}
                className="h-10 px-4 flex items-center justify-between gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium border border-transparent transition-colors rounded-sm min-w-[170px]"
              >
                <span className="flex-1 text-center">Manual Deploy</span>
                <motion.span animate={{ rotate: deployMenuOpen ? 180 : 0 }} className="shrink-0">
                  <FiChevronDown className="w-4 h-4" />
                </motion.span>
              </button>

              <motion.ul
                initial={deployMenuOpen ? "open" : "closed"}
                animate={deployMenuOpen ? "open" : "closed"}
                variants={{
                  open: { scaleY: 1, opacity: 1, transition: { duration: 0.2 } },
                  closed: { scaleY: 0, opacity: 0, transition: { duration: 0.2 } }
                }}
                style={{ originY: "top" }}
                className="flex flex-col p-1.5 rounded-sm bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] absolute top-[120%] right-0 min-w-[220px] overflow-hidden z-[100] shadow-lg shadow-black/5 dark:shadow-black/20"
              >
                <li
                  onClick={() => {
                    setDeployMode('latest');
                    setDeployMenuOpen(false);
                    setIsDeployModalOpen(true);
                  }}
                  className="flex items-center gap-2 p-2 text-sm font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#252525] rounded-sm transition-colors cursor-pointer"
                >
                  <MdFiberNew className="w-4 h-4 text-gray-500" />
                  Deploy latest commit
                </li>
                <li
                  onClick={() => {
                    setDeployMode('specific');
                    setDeployMenuOpen(false);
                    setIsDeployModalOpen(true);
                  }}
                  className="flex items-center gap-2 p-2 text-sm font-medium text-gray-700 dark:text-[#c9c9c9] hover:bg-gray-100 dark:hover:bg-[#252525] rounded-sm transition-colors cursor-pointer mt-1"
                >
                  <Icon name="gitCommit" className="w-4 h-4 text-gray-500 shrink-0" data-slot="geist-icon" />
                  Deploy a specific commit
                </li>
              </motion.ul>
            </div>
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

            {latestDeployed && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Last Deployment ID:</span>
                    <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                      {latestDeployed.publicId || `dep-${latestDeployed.id}`}
                      <button onClick={() => copyToClipboard(latestDeployed.publicId || `dep-${latestDeployed.id}`)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-[Geist]">
                    <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Status:</span>
                    {(() => {
                      const mapped = mapDeployStatus(latestDeployed.status);
                      return <StatusBadge status={mapped.type} label={mapped.label} />;
                    })()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Environment:</span>
                    <span className={`inline-flex items-center justify-center rounded-md font-[Geist] font-medium h-[24px] px-2.5 text-[13px] ${getEnvironmentColor(latestDeployed.environment || 'Production')}`}>
                      {(latestDeployed.environment || 'Production').toLowerCase() === 'production' ? (
                        <BiSolidBolt className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                      ) : (
                        <Icon name="environmentBurst" className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                      )}
                      {latestDeployed.environment || 'Production'}
                    </span>
                  </div>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
              <span className="inline-flex items-center max-w-full">
                <span className="translate-y-px mr-1.5 shrink-0">
                  <IoLogoGithub className="flex-shrink-0 w-5 h-5 text-gray-900 dark:text-white" aria-label="GitHub" />
                </span>
                <span className="group inline-flex items-center min-w-0 flex-shrink text-gray-900 dark:text-white">
                  <span className="inline-flex items-center type-body-01 max-w-full">
                    <a rel="noopener noreferrer" target="_blank" href={service.repositoryUrl || '#'} className="hover:underline">
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
                    <span className="flex items-center ml-1.5 mr-6">
                      {service.isPrivate ? (
                        <Icon name="lock" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" />
                      ) : (
                        <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 mr-6">
                      <Icon name="gitBranch" className="flex-none text-gray-900 dark:text-white" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                      <a rel="noopener noreferrer" target="_blank" href={`${service.repositoryUrl}/tree/${deployedBranch}`} className="hover:underline">
                        <span className="truncate min-w-0 flex-shrink font-geist-mono">{deployedBranch}</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Icon name="gitCommit" className="shrink-0 text-gray-900 dark:text-white" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                      {deployedCommitSha ? (
                        <a
                          rel="noopener noreferrer"
                          target="_blank"
                          href={`${service.repositoryUrl}/commit/${deployedCommitSha}`}
                          className="hover:underline"
                        >
                          <span className="truncate min-w-0 flex-shrink font-geist-mono text-[14px] text-gray-900 dark:text-white">{deployedCommitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="text-[14px] text-gray-500 dark:text-[#8f8f8f]">-</span>
                      )}
                    </div>
                  </span>
                </span>
              </span>
            </div>

            {service.deploymentUrls && service.deploymentUrls.length > 0 ? (
              <div className="flex flex-col gap-1.5 mt-2">
                {service.deploymentUrls.map((dUrl: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                    <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
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
                <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
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
  );
}
