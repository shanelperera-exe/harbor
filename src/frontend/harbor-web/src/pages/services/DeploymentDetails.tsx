import { useOutletContext, useParams } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { IoLogoGithub, IoTimeOutline } from 'react-icons/io5';
import { MdPublic } from 'react-icons/md';
import { Copy, Loader2 } from 'lucide-react';
import { LuExternalLink } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { GoWorkflow } from 'react-icons/go';
import { SiGithubactions } from 'react-icons/si';
import { BiSolidBolt } from 'react-icons/bi';
import { VscDebugRerun } from 'react-icons/vsc';
import { PiTimer } from 'react-icons/pi';
import UserAvatar from '../../components/ui/UserAvatar';
import { getDeploymentDetails, redeployDeployment, mapDeployStatus, type DeploymentDetails as IDeploymentDetails } from '../../services/deploymentService';
import { DeploymentLogs } from './DeploymentLogs';

const getEnvironmentColorBorder = (env: string) => {
  const e = env.toLowerCase();
  if (e === 'production') return 'border-[#0070f3] text-[#0070f3] dark:text-[#f0f0f0]';
  if (e === 'preview' || e === 'staging') return 'border-[#7928ca] text-[#7928ca] dark:text-[#f0f0f0]';
  if (e === 'development') return 'border-gray-200 dark:border-[#333] text-[#000] dark:text-[#fff]';
  return 'border-gray-500 text-gray-500 dark:text-[#f0f0f0]';
};

function getDuration(deploy: IDeploymentDetails): string {
  if (!deploy.completedAt || !deploy.startedAt) return '—';
  const ms = new Date(deploy.completedAt).getTime() - new Date(deploy.startedAt).getTime();
  const secs = Math.max(1, Math.round(ms / 1000));
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function DeploymentDetails() {
  const { service, deployRefreshKey } = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deploymentId } = useParams();
  const [deployment, setDeployment] = useState<IDeploymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);

  const [storedUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
    catch { return {}; }
  });

  useEffect(() => {
    if (!deploymentId) {
      setLoading(false);
      return;
    }
    const fetchDeploy = async () => {
      try {
        setLoading(true);
        const data = await getDeploymentDetails(deploymentId);
        setDeployment(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeploy();
  }, [deploymentId, deployRefreshKey]);

  if (!service) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleRedeploy = async () => {
    if (!deploymentId) return;
    try {
      setRedeploying(true);
      await redeployDeployment(deploymentId);
      // Wait a moment then refresh deploy data
      setTimeout(async () => {
        const data = await getDeploymentDetails(deploymentId);
        setDeployment(data);
      }, 500);
    } catch (e) {
      console.error(e);
    } finally {
      setRedeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 w-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563eb]" />
      </div>
    );
  }

  if (!deployment) {
    return <div className="p-8 text-center text-gray-500 w-full">Deployment not found.</div>;
  }

  // Find the exact URL for this deployment's environment
  let displayUrl = service.deploymentUrl;
  if (service.deploymentUrls && service.deploymentUrls.length > 0) {
    const matched = service.deploymentUrls.find((d: any) => d.environment.toLowerCase() === deployment.environment.toLowerCase());
    if (matched && matched.url) displayUrl = matched.url;
  }

  return (
    <div className="flex flex-col w-full">
      <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
        <header className="px-4 md:px-12 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 flex items-center gap-4">
              <h1 className="flex flex-wrap items-center gap-4 text-3xl font-medium text-gray-900 dark:text-white pr-4">
                <div className="min-w-0 break-words font-[Geist]">{deployment.commitMessage || deployment.version || 'Manual Deploy'}</div>
              </h1>
              <div className="font-mono text-[13px] font-medium tracking-wide bg-[#2563eb] text-white px-2 py-0.5 rounded-full flex items-center justify-center shrink-0 mt-1">
                {deployment.hash || (deployment.publicId || `dep-${deployment.id}`).replace('dep-', '').substring(0, 9)}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 text-base">
              <button
                onClick={handleRedeploy}
                disabled={redeploying}
                className="h-10 px-4 flex items-center justify-center gap-2 bg-white dark:bg-[#1a1a1a] hover:bg-gray-50 dark:hover:bg-[#272727] text-gray-900 dark:text-white font-[Geist] font-medium border border-gray-300 dark:border-[#525252] transition-colors rounded-sm disabled:opacity-50 shadow-sm"
              >
                {redeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <VscDebugRerun className="w-4 h-4" />}
                Redeploy
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 pt-2 text-base pb-6">
            {/* Left Column */}
            <div className="flex flex-col gap-2.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Deployment ID:</span>
                  <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                    {deployment.publicId || `dep-${deployment.id}`}
                    <button onClick={() => copyToClipboard(deployment.publicId || `dep-${deployment.id}`)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                  </span>
                </div>
                
                {/* Status inside header */}
                <div className="flex items-center gap-1.5 font-[Geist]">
                  {(() => {
                    const mapped = mapDeployStatus(deployment.status);
                    return <StatusBadge status={mapped.type} label={mapped.label} />;
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center rounded-md font-[Geist] font-medium h-[24px] px-2.5 text-[13px] border ${getEnvironmentColorBorder(deployment.environment || 'Production')}`}>
                    {(deployment.environment || 'Production').toLowerCase() === 'production' ? (
                      <BiSolidBolt className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#0070f3]" />
                    ) : (
                      <svg fill="currentColor" aria-hidden="true" className="w-3.5 h-3.5 mr-1.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                    )}
                    {deployment.environment || 'Production'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <div className="inline-flex items-center max-w-full">
                  <span className="translate-y-px mr-1.5 shrink-0">
                    <IoLogoGithub className="flex-shrink-0 w-5 h-5 text-gray-900 dark:text-white" aria-label="GitHub" />
                  </span>
                  <a rel="noopener noreferrer" target="_blank" href={service.repositoryUrl || '#'} className="text-gray-900 dark:text-white hover:underline truncate min-w-0 font-[Geist]">
                    {(() => {
                      const repoStr = service.repositoryName || 'portfolio';
                      const repoParts = repoStr.split('/');
                      const repoOwner = repoParts.length > 1 ? repoParts[0] : (service.repositoryOwner || 'shanelperera-exe');
                      const repoName = repoParts.length > 1 ? repoParts[1] : repoStr;
                      return `${repoOwner} / ${repoName}`;
                    })()}
                  </a>
                  <span className="flex items-center ml-1.5 mr-3">
                    {service.isPrivate ? (
                      <svg fill="currentColor" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M12 7.51172H11V4.51172C11 3.71607 10.6839 2.95301 10.1213 2.3904C9.55871 1.82779 8.79565 1.51172 8 1.51172C7.20435 1.51172 6.44129 1.82779 5.87868 2.3904C5.31607 2.95301 5 3.71607 5 4.51172V7.51172H4C3.73478 7.51172 3.48043 7.61708 3.29289 7.80461C3.10536 7.99215 3 8.2465 3 8.51172V14.5117C3 14.7769 3.10536 15.0313 3.29289 15.2188C3.48043 15.4064 3.73478 15.5117 4 15.5117H12C12.2652 15.5117 12.5196 15.4064 12.7071 15.2188C12.8946 15.0313 13 14.7769 13 14.5117V8.51172C13 8.2465 12.8946 7.99215 12.7071 7.80461C12.5196 7.61708 12.2652 7.51172 12 7.51172ZM6 4.51172C6 3.98129 6.21071 3.47258 6.58579 3.09751C6.96086 2.72243 7.46957 2.51172 8 2.51172C8.53043 2.51172 9.03914 2.72243 9.41421 3.09751C9.78929 3.47258 10 3.98129 10 4.51172V7.51172H6V4.51172ZM4 8.51172H12V14.5117H4V8.51172Z"></path></svg>
                    ) : (
                      <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                    )}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-gray-900 dark:text-white fill-current">
                      {deployment.commitSha ? (
                        <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/commit/${deployment.commitSha}` : "#"} rel="noopener noreferrer" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          </span>
                          <span className="whitespace-nowrap">{deployment.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-mono text-gray-900 dark:text-white">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="shrink-0" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                          -
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-gray-900 dark:text-white fill-current">
                      {service.repositoryBranch ? (
                        <a href={`${service.repositoryUrl}/tree/${service.repositoryBranch}`} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1.5 text-[14px] font-mono truncate hover:underline cursor-pointer">
                          <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="flex-none" style={{ color: 'currentcolor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
                          {service.repositoryBranch}
                        </a>
                      ) : (
                        <span className="text-[14px] font-mono text-gray-900 dark:text-white">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-0.5 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                <span>Deployment URL ({deployment.environment || 'Production'}):</span>
                <a href={displayUrl ? (displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  {displayUrl || 'No URL available'}
                  <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </a>
              </div>
            </div>

            {/* Right Column: Workflow Info Grid & Created/Duration */}
            <div className="flex flex-col gap-3 shrink-0 font-[Geist] pt-0.5">
              <div className="grid grid-cols-2 gap-3">
                {/* Workflow */}
                <div className="border border-gray-300 dark:border-[#525252] rounded-md px-3.5 py-2 flex items-center gap-3">
                  <GoWorkflow className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-[#8f8f8f] leading-tight">Workflow</span>
                    <span className="text-[14px] font-mono text-gray-900 dark:text-[#f0f0f0] leading-tight mt-0.5">{deployment.workflowFile || 'deploy.yml'}</span>
                  </div>
                </div>

                {/* GitHub Action */}
                <div className="border border-gray-300 dark:border-[#525252] rounded-md px-3.5 py-2 flex items-center gap-3">
                  <SiGithubactions className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-[#8f8f8f] leading-tight">GitHub Action</span>
                    {(() => {
                      const runUrl = deployment.workflowRunUrl || (() => {
                        if (service.repositoryUrl) {
                          if (deployment.commitSha) {
                            return `${service.repositoryUrl}/actions?query=head_sha%3A${deployment.commitSha}`;
                          }
                          return `${service.repositoryUrl}/actions`;
                        }
                        const repoStr = service.repositoryName || 'portfolio';
                        const parts = repoStr.split('/');
                        const owner = parts.length > 1 ? parts[0] : (service.repositoryOwner || 'shanelperera-exe');
                        const name = parts.length > 1 ? parts[1] : repoStr;
                        return `https://github.com/${owner}/${name}/actions`;
                      })();

                      return (
                        <a 
                          href={runUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[14px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 w-fit leading-tight mt-0.5"
                        >
                          View Run <LuExternalLink className="w-3.5 h-3.5" />
                        </a>
                      );
                    })()}
                  </div>
                </div>

                {/* Started */}
                <div className="border border-gray-300 dark:border-[#525252] rounded-md px-3.5 py-2 flex items-center gap-3">
                  <IoTimeOutline className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-[#8f8f8f] leading-tight">Started</span>
                    <span className="text-[14px] text-gray-900 dark:text-[#f0f0f0] whitespace-nowrap leading-tight mt-0.5">
                      {deployment.startedAt ? format(new Date(deployment.startedAt), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                </div>

                {/* Completed */}
                <div className="border border-gray-300 dark:border-[#525252] rounded-md px-3.5 py-2 flex items-center gap-3">
                  <IoTimeOutline className="w-6 h-6 text-gray-400 dark:text-gray-500 shrink-0" />
                  <div className="flex flex-col justify-center">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-[#8f8f8f] leading-tight">Completed</span>
                    <span className="text-[14px] text-gray-900 dark:text-[#f0f0f0] whitespace-nowrap leading-tight mt-0.5">
                      {deployment.completedAt ? format(new Date(deployment.completedAt), 'MMM d, yyyy HH:mm') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Created and Duration */}
              <div className="flex flex-wrap items-center gap-4 text-[15px] pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#8f8f8f]">Created</span>
                  <span className="flex items-center gap-1.5 text-gray-900 dark:text-[#f0f0f0] font-medium">
                    <span>{storedUser.username || 'Unknown'}</span>
                    <UserAvatar svgString={storedUser.avatarSvg} username={storedUser.username || 'Unknown'} size={18} className="rounded-full" />
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <PiTimer className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-gray-500 dark:text-[#8f8f8f]">Duration</span>
                  <span className="text-gray-900 dark:text-[#f0f0f0] font-mono ml-0.5">{getDuration(deployment)}</span>
                  <span className="text-gray-500 dark:text-[#8f8f8f] ml-1">{deployment.startedAt ? formatDistanceToNow(new Date(deployment.startedAt), { addSuffix: true }) : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
        <DeploymentLogs deployment={deployment} />
      </main>
    </div>
  );
}
