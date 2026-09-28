import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Pencil, Copy, Check } from 'lucide-react';
import { HiOutlineCalendarDateRange } from "react-icons/hi2";
import { IoTimeOutline } from "react-icons/io5";
import {
  getEnvironments,
  createEnvironment,
  type DeploymentEnvironment,
  type EnvironmentType,
} from '../../services/environmentService';
import { getProject, type Project } from '../../services/projectService';
import { getServices, type Service } from '../../services/serviceService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Icon } from '../../components/icons';

export default function ProjectEnvironments() {
  const { id } = useParams();
  const projectId = id as string;
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  useEffect(() => {
    if (!projectId) { 
      setLoading(false); 
      return; 
    }
    
    Promise.all([getProject(projectId), getEnvironments(projectId), getServices(projectId)])
      .then(([loadedProject, loadedEnvironments, loadedServices]) => {
        if (!loadedProject) throw new Error('Project not found.');
        setProject(loadedProject);
        setEnvironments(loadedEnvironments);
        setServices(loadedServices);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  const [isAddEnvironmentModalOpen, setIsAddEnvironmentModalOpen] = useState(false);
  const [newEnvironmentName, setNewEnvironmentName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvironmentName.trim()) return;

    setIsCreating(true);
    setCreateError('');

    try {
      // Default to Development type since UI only asks for name. 
      // In a real app we might infer from name or add a select field.
      let type: EnvironmentType = 'Development';
      const lowerName = newEnvironmentName.toLowerCase();
      if (lowerName.includes('prod')) type = 'Production';
      else if (lowerName.includes('stag')) type = 'Staging';

      const newEnv = await createEnvironment(projectId, {
        name: newEnvironmentName.trim(),
        type,
      });

      setEnvironments(prev => [...prev, newEnv]);
      setIsAddEnvironmentModalOpen(false);
      setNewEnvironmentName('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create environment.');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-[#b3b3b3]">Loading...</div>;
  }

  if (!project) {
    return <div className="p-12 text-red-400">Project not found</div>;
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white transition-colors duration-300">
      
      {/* Header Section */}
      <div className="my-12 pb-12 border-b border-gray-300 dark:border-[#525252]">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-12 space-y-2 md:space-y-1">
          <div className="text-[14px] leading-[20px] font-normal text-gray-500 dark:text-[#8f8f8f]" style={{ fontFamily: '"Neue Montreal", sans-serif' }}>Project</div>
          <div className="md:min-h-10 flex flex-col md:flex-row items-start md:items-start md:justify-between gap-y-6 md:gap-y-0">
            
            {/* Title, ID & Description */}
            <div className="flex-1 pr-4">
              <Link
                to={`/projects/${projectId}/settings?edit=name`}
                className="group inline-flex items-baseline justify-start gap-3 px-2 py-1.5 -mx-2 -my-1.5 hover:bg-transparent text-left"
                title="Edit project name"
              >
                <h1 className="m-0 text-[26px] md:text-[32px] font-medium text-gray-900 dark:text-white break-words">
                  {project.name}
                </h1>
                <Pencil className="w-4 h-4 text-gray-400 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                <span className="sr-only">Edit project name</span>
              </Link>
              
              {project.publicId && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400 text-[13px]">Project ID:</span>
                  <div className="flex items-center gap-1.5 border border-gray-300 dark:border-[#3a3a3a] bg-gray-50 dark:bg-white/[0.03] rounded-sm px-2 py-1 transition-colors">
                    <code className="text-[13px] font-mono text-gray-900 dark:text-[#f0f0f0]" style={{ fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                      {project.publicId}
                    </code>
                    <button 
                      onClick={() => handleCopy(project.publicId!)}
                      className="text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white transition-colors ml-1"
                      title="Copy ID"
                    >
                      {copiedId === project.publicId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
              
              {project.description && (
                <p className="mt-4 text-[15px] text-gray-600 dark:text-[#a1a1aa] max-w-2xl leading-relaxed">
                  {project.description}
                </p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="inline-flex flex-wrap gap-4">
              <button 
                type="button"
                onClick={() => setIsAddEnvironmentModalOpen(true)}
                className="flex items-center gap-2 h-10 px-3 py-2.5 text-[14px] font-medium text-gray-700 dark:text-[#e3e3e3] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] hover:bg-gray-100 dark:hover:bg-white border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-transparent transition-colors group disabled:opacity-50 rounded-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="mr-2">Add environment</span>
                <span className="inline-flex items-center px-2 h-6 text-[12px] bg-gray-200 dark:bg-[#272727] text-gray-900 dark:text-white group-hover:bg-gray-300 dark:group-hover:bg-[oklch(0.21_0.03_263.45)] group-hover:text-gray-900 dark:group-hover:text-white transition-colors tabular-nums border border-transparent rounded-sm">
                  {environments.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1920px] mx-auto px-4 md:px-12 space-y-20 mb-20">
        {environments.map(env => (
          <section key={env.id} className="transition duration-500">
            <div className="scroll-mt-20">
              <h2 className="flex items-center gap-2 text-[20px] font-medium text-gray-900 dark:text-[#f0f0f0] mb-4">
                {env.name}
              </h2>
            </div>
            
            <div className="mb-6 space-y-4">
              <div className="h-10 w-full flex items-center justify-between">
                <div className="flex-1 flex gap-x-2">
                  {/* Tabs */}
                  <ul className="flex text-[14px]">
                    <li>
                      <button className="flex items-center gap-2 h-8 px-2 py-2 border border-l border-y border-[#3b82f6] text-white bg-[#2563eb] font-medium rounded-sm">
                        <span className="flex gap-1 capitalize">
                          <span>Services</span>
                          <span>({services.length})</span>
                        </span>
                      </button>
                    </li>
                  </ul>
                </div>
                
                <div className="flex">
                  <button
                    className="flex items-center justify-center h-8 px-3 text-gray-700 dark:text-[#e3e3e3] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#ffffff1a] transition-colors rounded-sm border border-gray-300 dark:border-[#525252] text-[13px] font-medium gap-2"
                    title="Settings"
                    onClick={() => navigate(`/projects/${projectId}/environments/${env.id}/settings`)}
                  >
                    <Icon name="settings" className="w-4 h-4" />
                    Settings
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col">
                <label htmlFor={`search-${env.id}`} className="sr-only">Search resources in {env.name}</label>
                <div className="flex relative">
                  <Search className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#8f8f8f] left-3 pointer-events-none" />
                  <input 
                    id={`search-${env.id}`}
                    placeholder={`Search resources in ${env.name}`}
                    spellCheck="false"
                    autoComplete="off"
                    className="truncate h-10 w-full pl-9 pr-3 py-2.5 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#b3b3b3] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none text-gray-900 dark:text-white text-[14px] transition-colors placeholder:text-gray-400 dark:placeholder:text-[#8f8f8f] rounded-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="border border-gray-300 dark:border-[#525252] rounded-sm bg-white dark:bg-white/[0.02]">
              {/* Services: table if populated, empty-state otherwise */}
              {services.length > 0 ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-[15px] text-left whitespace-nowrap">
                    <thead className="border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-white/[0.02]">
                      <tr>
                        <th scope="col" className="h-10 pl-6 pr-4 font-medium uppercase tracking-wider text-[12px] flex items-center gap-2">
                          Service Name
                          <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-gray-200 dark:bg-[#ffffff1a] text-gray-900 dark:text-white rounded-sm tabular-nums font-sans">{services.length}</span>
                        </th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[12px]">Status</th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[12px]">Domain</th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[12px]">Last Deployed</th>
                        <th scope="col" className="h-10 p-0 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 dark:divide-[#525252] bg-white dark:bg-transparent">
                      {services.map(service => (
                        <tr 
                          key={service.id}
                          className="h-[72px] hover:bg-gray-50 dark:hover:bg-[#ffffff0a] transition-colors group cursor-pointer"
                          onClick={() => navigate(`/projects/${projectId}/services/${service.publicId || service.id}`)}
                        >
                          <td className="pl-6 pr-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-3">
                                {service.type === 'web' ? (
                                  <Icon name="globe" className="w-6 h-6 text-gray-500 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
                                ) : (
                                  <Icon name="staticSite" className="w-6 h-6 text-gray-500 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white transition-colors shrink-0" />
                                )}
                                <span className="text-[16px] font-semibold text-gray-900 dark:text-white group-hover:underline underline-offset-2 decoration-gray-400 dark:decoration-gray-500">
                                  {service.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5 ml-9">
                                <div className="flex items-center justify-start flex-nowrap gap-1 h-[22px] transition-all duration-300 text-gray-500 dark:text-[#8f8f8f]">
                                  <Icon name="gitBranch" className="flex-none" style={{ color: "currentcolor" }} />
                                  <a href={service.repositoryUrl && service.repositoryBranch ? `${service.repositoryUrl}/tree/${service.repositoryBranch}` : "#"} rel="noopener" target="_blank" title="Git Branch" onClick={(e) => e.stopPropagation()} className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 z-[2] flex shrink gap-2 truncate hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <code className="text-[13.5px] leading-[18px] font-mono empty:hidden">{service.repositoryBranch || 'main'}</code>
                                  </a>
                                </div>
                                {service.repositoryCommit && (
                                  <div className="flex items-center justify-start flex-nowrap gap-1 h-[22px] transition-all duration-300 text-gray-500 dark:text-[#8f8f8f]">
                                    <span className="inline-flex h-fit items-center flex-none">
                                      <Icon name="gitCommit" style={{ color: "currentcolor" }} />
                                    </span>
                                    <a href={service.repositoryUrl ? `${service.repositoryUrl}/commit/${service.repositoryCommit}` : "#"} rel="noopener" target="_blank" title="Git Commit" onClick={(e) => e.stopPropagation()} className="cursor-pointer focus-visible:outline-2 outline-[#2563eb] outline-offset-4 z-[2] flex shrink items-center gap-1.5 truncate hover:text-gray-900 dark:hover:text-white transition-colors group/commit">
                                      <code className="max-w-full text-[13.5px] leading-[18px] font-mono empty:hidden text-gray-900 dark:text-[#ededed] group-hover/commit:underline underline-offset-2">{service.repositoryCommit.substring(0, 7)}</code>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4">
                            <StatusBadge status="ready" label="Ready" />
                          </td>
                          <td className="px-4 text-[14px]">
                            {service.deploymentUrl ? (
                              <a href={service.deploymentUrl.startsWith('http') ? service.deploymentUrl : `https://${service.deploymentUrl}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-900 dark:text-[#f0f0f0] hover:text-[#2563eb] dark:hover:text-[#3b82f6] hover:underline transition-colors flex items-center gap-1.5">
                                {service.deploymentUrl.replace(/^https?:\/\//, '')}
                                <Icon name="externalLink" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            ) : (
                              <a href={`https://${service.name}-${env.name.toLowerCase()}.harbor.app`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-900 dark:text-[#f0f0f0] hover:text-[#2563eb] dark:hover:text-[#3b82f6] hover:underline transition-colors flex items-center gap-1.5">
                                {service.name}-{env.name.toLowerCase()}.harbor.app
                                <Icon name="externalLink" className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 text-[14px] text-gray-500 dark:text-[#a1a1aa]">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-gray-900 dark:text-[#e3e3e3]">
                                <HiOutlineCalendarDateRange className="w-4 h-4 text-gray-500 dark:text-[#8f8f8f]" />
                                <span>{new Date(service.createdAt).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <IoTimeOutline className="w-4 h-4" />
                                <span>{new Date(service.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 pr-4 text-right">
                            <button onClick={(e) => { e.stopPropagation(); }} className="h-8 w-8 inline-flex items-center justify-center text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#ffffff1a] rounded-sm transition-colors" title="Actions">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center border-t border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-white/[0.01]">
                    <button 
                      className="w-full flex items-center justify-start gap-2 h-[52px] px-6 text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff0a] hover:text-gray-900 dark:hover:text-white transition-colors text-[14px] font-medium rounded-b-sm"
                      onClick={() => navigate(`/projects/${projectId}/services/new`)}
                    >
                      <Plus className="w-4 h-4" />
                      Add New Service
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex items-center mx-auto w-full bg-gray-50 dark:bg-white/[0.01] border-t border-gray-300 dark:border-[#525252]">
                  <div className="max-w-[500px] w-full py-20 px-4 mx-auto space-y-8">
                    <div className="space-y-2">
                      <h3 className="text-[20px] font-semibold text-gray-900 dark:text-white">{env.name} is empty</h3>
                      <p className="text-[16px] text-gray-600 dark:text-[#c7c7c7]">
                        Kickstart your environment by creating a new service or by moving an existing one.
                      </p>
                    </div>
                    <div className="inline-flex flex-wrap flex-col gap-2 sm:flex-row sm:gap-x-4">
                      <button
                        type="button"
                        onClick={() => navigate(`/projects/${projectId}/services/new`)}
                        className="h-10 py-2.5 px-3 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-[#2563eb] dark:hover:bg-[#2563eb] hover:text-white dark:hover:text-white font-medium text-[15px] transition-colors inline-flex items-center rounded-sm"
                      >
                        <div className="inline-flex w-4 h-4 me-1.5">
                          <Icon name="plus" />
                        </div>
                        Create new service
                      </button>
                      <button
                        type="button"
                        className="h-10 py-2.5 px-3 border border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] font-medium text-[15px] transition-colors flex items-center rounded-sm"
                      >
                        <div className="inline-flex w-4 h-4 me-1.5">
                          <Icon name="arrowLeftBack" />
                        </div>
                        Move existing services
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}
        
        {environments.length === 0 && (
          <div className="text-gray-500 dark:text-[#b3b3b3] italic pt-8 border-t border-gray-300 dark:border-[#525252]">
            No environments configured for this project.
          </div>
        )}
        
        <div 
          onClick={() => setIsAddEnvironmentModalOpen(true)}
          className="w-full border p-8 py-16 text-center border-dashed border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)] cursor-pointer transition-all text-gray-700 dark:text-[#f0f0f0] hover:text-[#3b82f6] dark:hover:text-[#3b82f6] active:text-[#2563eb] rounded-sm mt-8"
        >
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 text-[15px] font-medium">
              <Plus className="w-5 h-5" />
              <span>Add environment</span>
            </div>
          </div>
        </div>
      </main>

      {/* Add Environment Modal */}
      {isAddEnvironmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="inline-block w-full text-left align-middle transform bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] max-w-2xl rounded-sm">
            <form 
              noValidate 
              onSubmit={handleCreateEnvironment}
            >
              <div className="flex flex-col gap-2 items-start border-b border-[#4d4d4d] p-6 relative">
                <div className="w-full pr-8">
                  <h1 className="text-[24px] font-medium text-white mb-1">Add a new environment</h1>
                  <div className="text-[16px] text-[#c7c7c7]">
                    <a rel="noopener noreferrer" target="_blank" className="text-[#3b82f6] hover:text-[#60a5fa] hover:underline underline-offset-2 transition-colors" href="https://render.com/docs/projects">Environments</a> help you organize the deployments of your application.
                  </div>
                </div>
                <button 
                  className="flex p-1.5 text-[#e3e3e3] hover:text-white hover:bg-[#ffffff1a] transition-colors rounded-sm absolute right-4 top-4" 
                  type="button" 
                  aria-label="Close modal"
                  onClick={() => setIsAddEnvironmentModalOpen(false)}
                >
                  <Icon name="close" aria-hidden="true" width="16" height="16" />
                </button>
              </div>

              <div className="text-[16px] text-[#f0f0f0] p-6 space-y-6">
                <div className="flex flex-col">
                  <label htmlFor="new-environment-name-field" className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">Environment name</label>
                  <div className="flex relative">
                    <input 
                      id="new-environment-name-field" 
                      placeholder="e.g. Staging" 
                      className="h-10 truncate w-full m-0 py-2.5 px-3 bg-transparent border border-[#6b6b6b] hover:border-[#b3b3b3] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none text-[#f0f0f0] text-[16px] placeholder:text-[#8f8f8f] transition-colors disabled:opacity-50 rounded-sm" 
                      type="text" 
                      name="name"
                      value={newEnvironmentName}
                      onChange={(e) => { setNewEnvironmentName(e.target.value); setCreateError(''); }}
                      disabled={isCreating}
                      autoFocus
                    />
                  </div>
                  {createError && (
                    <div className="mt-2 text-red-400 text-sm">{createError}</div>
                  )}
                </div>
              </div>

              <div className="w-full flex justify-start space-x-3 p-6 border-t border-[#4d4d4d] bg-[oklch(0.21_0.03_263.45)]">
                <button 
                  type="submit" 
                  disabled={!newEnvironmentName.trim() || isCreating} 
                  className="h-10 py-2.5 px-4 bg-white text-black hover:bg-[#2563eb] hover:text-white disabled:bg-[#272727] disabled:text-[#4d4d4d] disabled:cursor-not-allowed font-medium text-[15px] transition-colors flex items-center rounded-sm"
                >
                  {isCreating ? 'Creating...' : 'Create environment'}
                </button>
                <button 
                  type="button" 
                  disabled={isCreating}
                  onClick={() => setIsAddEnvironmentModalOpen(false)}
                  className="h-10 py-2.5 px-4 border border-[#fff6] text-[#e3e3e3] hover:bg-[#ffffff1a] hover:text-white disabled:opacity-50 font-medium text-[15px] transition-colors flex items-center rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
