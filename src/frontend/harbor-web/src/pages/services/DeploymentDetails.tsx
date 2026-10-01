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
import { Icon } from '../../components/icons';

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

function readStoredUser() {
  try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
  catch { return {}; }
}

export default function DeploymentDetails() {
  const { service, deployRefreshKey } = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const { deploymentId } = useParams();
  const [deployment, setDeployment] = useState<IDeploymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);

  const storedUser = readStoredUser();
  const currentUsername: string = storedUser.username ?? '';
  const currentAvatarSvg: string | null = storedUser.avatarSvg ?? null;

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
      {/* Failure reason: previously only surfaced through the no-logs fallback in
          DeploymentLogs, so a failed deployment that produced log output showed no reason
          at all on this page. */}
      {deployment.status?.toLowerCase() === 'failed' && (deployment.failureReason || deployment.triggerError) && (
        <div className="px-4 md:px-12 pt-6">
          <div
            data-testid="deployment-failure-reason"
            className="rounded-md border border-red-500 dark:border-red-600/50 bg-red-50 dark:bg-red-950/30 px-4 py-3"
          >
            <strong className="block text-sm font-medium text-red-700 dark:text-red-400 mb-1">Deployment failed</strong>
            <p className="text-sm text-red-700 dark:text-red-300">{deployment.failureReason || deployment.triggerError}</p>
          </div>
        </div>
      )}
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

              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Environment:</span>
                  <span className={`inline-flex items-center justify-center rounded-md font-[Geist] font-medium h-[24px] px-2.5 text-[13px] border ${getEnvironmentColorBorder(deployment.environment || 'Production')}`}>
                    {(deployment.environment || 'Production').toLowerCase() === 'production' ? (
                      <BiSolidBolt className="w-3.5 h-3.5 mr-1.5 shrink-0 text-[#0070f3]" />
                    ) : (
                      <Icon name="environmentBurst" className="w-3.5 h-3.5 mr-1.5 shrink-0" aria-hidden="true" />
                    )}
                    {deployment.environment || 'Production'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Project:</span>
                  <span data-testid="deployment-project-name" className="text-gray-900 dark:text-[#f0f0f0] font-[Geist]">
                    {deployment.projectName || 'Unknown'}
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
                      <Icon name="lock" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" />
                    ) : (
                      <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
                    )}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center text-gray-900 dark:text-white fill-current">
                      {deployment.commitSha ? (
                        <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/commit/${deployment.commitSha}` : "#"} rel="noopener noreferrer" target="_blank" data-zone="null" className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 relative z-[2] flex items-center gap-1.5 shrink-0 w-fit text-[14px] font-geist-mono text-gray-900 dark:text-white no-underline hover:underline">
                          <span className="inline-flex h-fit items-center" data-testid="legacy/tooltip-trigger" data-version="v1" tabIndex={0}>
                            <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          </span>
                          <span className="whitespace-nowrap">{deployment.commitSha.substring(0, 7)}</span>
                        </a>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[14px] font-geist-mono text-gray-900 dark:text-white">
                          <Icon name="gitCommit" className="shrink-0" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          -
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-gray-900 dark:text-white fill-current">
                      {service.repositoryBranch ? (
                        <a href={`${service.repositoryUrl}/tree/${service.repositoryBranch}`} rel="noopener noreferrer" target="_blank" className="flex items-center gap-1.5 text-[14px] font-geist-mono truncate hover:underline cursor-pointer">
                          <Icon name="gitBranch" className="flex-none" style={{ color: 'currentcolor' }} data-slot="geist-icon" />
                          {service.repositoryBranch}
                        </a>
                      ) : (
                        <span className="text-[14px] font-geist-mono text-gray-900 dark:text-white">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-0.5 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
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
                  <span className="text-gray-500 dark:text-[#8f8f8f]">Created by</span>
                  <span className="flex items-center gap-1.5 text-gray-900 dark:text-[#f0f0f0] font-medium">
                    <span data-testid="deployment-user-name">{deployment.userName || 'Unknown'}</span>
                    <UserAvatar
                      username={deployment.userName || 'Unknown'}
                      svgString={deployment.userName && deployment.userName === currentUsername ? currentAvatarSvg : null}
                      size={18}
                      className="rounded-full"
                    />
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
