import { useOutletContext, useSearchParams } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { mapDeployStatus } from './ServiceDeploys';
import { IoLogoGithub } from 'react-icons/io5';
import { MdPublic } from 'react-icons/md';
import { Copy, RefreshCw, Loader2 } from 'lucide-react';
import { LuExternalLink } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { getDeploymentDetails, redeployDeployment, type DeploymentDetails as IDeploymentDetails } from '../../services/deploymentService';

export default function DeploymentDetails() {
  const { service, deployRefreshKey } = useOutletContext<{ service: any; deployRefreshKey: number }>();
  const [searchParams] = useSearchParams();
  const deploymentId = searchParams.get('deploymentId');
  const [deployment, setDeployment] = useState<IDeploymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeploying, setRedeploying] = useState(false);

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
                <div className="min-w-0 break-words font-[Geist]">{deployment.version || 'Manual Deploy'}</div>
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
                {redeploying ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Redeploy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-2 text-base pb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[15px]">
                <span className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">Deployment ID:</span>
                <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                  {deployment.publicId || `dep-${deployment.id}`}
                  <button onClick={() => copyToClipboard(deployment.publicId || `dep-${deployment.id}`)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                </span>
                
                {/* Status inside header */}
                <span className="ml-4 flex items-center gap-1.5 border-l border-gray-300 dark:border-[#525252] pl-4 font-[Geist]">
                  {(() => {
                    const mapped = mapDeployStatus(deployment.status);
                    return <StatusBadge status={mapped.type} label={mapped.label} />;
                  })()}
                </span>
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                <span className="inline-flex items-center max-w-full">
                  <span className="translate-y-px mr-1.5 shrink-0">
                    <IoLogoGithub className="flex-shrink-0 w-5 h-5 text-gray-900 dark:text-white" aria-label="GitHub" />
                  </span>
                  <span className="group inline-flex items-center cursor-pointer no-underline min-w-0 flex-shrink text-gray-900 dark:text-white">
                    <span className="inline-flex items-center type-body-01 hover:underline max-w-full">
                      <a rel="noopener noreferrer" target="_blank" href={service.repositoryUrl || '#'} className="hover:underline">
                        <span className="truncate min-w-0 flex-shrink font-[Geist]">
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
                      <div className="flex items-center gap-4 border-l border-gray-300 dark:border-[#525252] pl-4">
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
                    </span>
                  </span>
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-[15px] text-gray-700 dark:text-[#a1a1aa] font-[Geist]">
                <span>Deployment URL ({deployment.environment || 'Production'}):</span>
                <a href={displayUrl ? (displayUrl.startsWith('http') ? displayUrl : `https://${displayUrl}`) : '#'} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                  {displayUrl || 'No URL available'}
                  <LuExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </a>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
        {/* We can place logs or other details here soon! */}
        <div className="text-gray-500 dark:text-[#8f8f8f] font-[Geist]">
          Deployment pipeline logs and detailed traces will appear here.
        </div>
      </main>
    </div>
  );
}
