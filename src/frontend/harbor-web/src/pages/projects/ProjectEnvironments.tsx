import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Pencil } from 'lucide-react';
import {
  getEnvironments,
  createEnvironment,
  type DeploymentEnvironment,
  type EnvironmentType,
} from '../../services/environmentService';
import { getProject, type Project } from '../../services/projectService';
import { getServices, type Service } from '../../services/serviceService';

export default function ProjectEnvironments() {
  const { id } = useParams();
  const projectId = id as string;
  const navigate = useNavigate();
  const [project, setProject] = useState<Project>();
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

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
          <div className="md:min-h-10 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-y-6 md:gap-y-0">
            
            {/* Title & Edit */}
            <div className="flex-1 pr-4">
              <Link
                to={`/projects/${projectId}/settings?edit=name`}
                className="group flex items-baseline justify-start gap-3 px-2 py-1.5 -mx-2 -my-1.5 hover:bg-transparent text-left"
                title="Edit project name"
              >
                <h1 className="m-0 text-[26px] md:text-[32px] font-medium text-gray-900 dark:text-white break-words">
                  {project.name}
                </h1>
                <Pencil className="w-4 h-4 text-gray-400 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                <span className="sr-only">Edit project name</span>
              </Link>

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
              <h2 className="flex items-center gap-2 text-[20px] font-medium text-gray-900 dark:text-[#f0f0f0]">
                {env.name}
              </h2>
            </div>
            
            <div>
              <div className="my-3">
                <div className="h-10 w-full flex items-center justify-between">
                  <div className="flex-1 flex gap-x-2">
                    {/* Tabs */}
                    <ul className="flex text-[14px]">
                      <li>
                        <button className="flex items-center gap-2 h-8 px-2 py-2 border border-l border-y border-[#3b82f6] text-white bg-[#2563eb] font-medium rounded-sm">
                          <span className="flex gap-1 capitalize">
                            <span>Services</span>
                            <span>(1)</span>
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
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M13.5 8.38008C13.5 8.25508 13.5 8.13008 13.5 8.00008C13.5 7.87008 13.5 7.74508 13.5 7.61508L14.46 6.77508C14.637 6.61911 14.7531 6.40559 14.7879 6.17228C14.8226 5.93897 14.7738 5.70088 14.65 5.50008L13.47 3.50008C13.3823 3.34821 13.2562 3.22207 13.1044 3.13431C12.9526 3.04655 12.7804 3.00026 12.605 3.00008C12.4963 2.99925 12.3882 3.01614 12.285 3.05008L11.07 3.46008C10.8602 3.32068 10.6414 3.19541 10.415 3.08508L10.16 1.82508C10.1143 1.59488 9.98905 1.3881 9.80623 1.24093C9.62341 1.09376 9.39466 1.01558 9.16 1.02008H6.82C6.58535 1.01558 6.3566 1.09376 6.17378 1.24093C5.99096 1.3881 5.86573 1.59488 5.82 1.82508L5.565 3.08508C5.33697 3.19538 5.11649 3.32066 4.905 3.46008L3.715 3.03008C3.61065 3.00289 3.50259 2.99276 3.395 3.00008C3.21964 3.00026 3.04741 3.04655 2.89559 3.13431C2.74376 3.22207 2.61769 3.34821 2.53 3.50008L1.35 5.50008C1.2333 5.70058 1.18993 5.93541 1.22733 6.16436C1.26473 6.39332 1.38057 6.60214 1.555 6.75508L2.5 7.62008C2.5 7.74508 2.5 7.87008 2.5 8.00008C2.5 8.13008 2.5 8.25508 2.5 8.38508L1.555 9.22508C1.37564 9.37908 1.25663 9.59165 1.2191 9.82505C1.18158 10.0585 1.22795 10.2976 1.35 10.5001L2.53 12.5001C2.61769 12.6519 2.74376 12.7781 2.89559 12.8659C3.04741 12.9536 3.21964 12.9999 3.395 13.0001C3.50368 13.0009 3.61176 12.984 3.715 12.9501L4.93 12.5401C5.13977 12.6795 5.35859 12.8048 5.585 12.9151L5.84 14.1751C5.88573 14.4053 6.01096 14.6121 6.19378 14.7592C6.3766 14.9064 6.60535 14.9846 6.84 14.9801H9.2C9.43466 14.9846 9.66341 14.9064 9.84623 14.7592C10.029 14.6121 10.1543 14.4053 10.2 14.1751L10.455 12.9151C10.683 12.8048 10.9035 12.6795 11.115 12.5401L12.325 12.9501C12.4282 12.984 12.5363 13.0009 12.645 13.0001C12.8204 12.9999 12.9926 12.9536 13.1444 12.8659C13.2962 12.7781 13.4223 12.6519 13.51 12.5001L14.65 10.5001C14.7667 10.2996 14.8101 10.0648 14.7727 9.8358C14.7353 9.60685 14.6194 9.39802 14.445 9.24508L13.5 8.38008ZM12.605 12.0001L10.89 11.4201C10.4885 11.7601 10.0297 12.026 9.535 12.2051L9.18 14.0001H6.82L6.465 12.2251C5.97422 12.0409 5.51786 11.7755 5.115 11.4401L3.395 12.0001L2.215 10.0001L3.575 8.80008C3.48255 8.28251 3.48255 7.75265 3.575 7.23508L2.215 6.00008L3.395 4.00008L5.11 4.58008C5.51147 4.24003 5.97031 3.97421 6.465 3.79508L6.82 2.00008H9.18L9.535 3.77508C10.0258 3.95929 10.4821 4.22465 10.885 4.56008L12.605 4.00008L13.785 6.00008L12.425 7.20008C12.5175 7.71765 12.5175 8.24751 12.425 8.76508L13.785 10.0001L12.605 12.0001Z"></path><path d="M8 11.0001C7.40666 11.0001 6.82664 10.8241 6.33329 10.4945C5.83995 10.1648 5.45543 9.69631 5.22837 9.14813C5.0013 8.59995 4.94189 7.99675 5.05765 7.41481C5.1734 6.83287 5.45913 6.29832 5.87868 5.87876C6.29824 5.4592 6.83279 5.17348 7.41473 5.05773C7.99668 4.94197 8.59988 5.00138 9.14805 5.22844C9.69623 5.45551 10.1648 5.84002 10.4944 6.33337C10.8241 6.82672 11 7.40674 11 8.00008C11.004 8.39516 10.9292 8.78707 10.7798 9.15286C10.6305 9.51865 10.4096 9.85096 10.1303 10.1303C9.85089 10.4097 9.51857 10.6305 9.15278 10.7799C8.787 10.9292 8.39508 11.0041 8 11.0001ZM8 6.00008C7.73568 5.99392 7.47285 6.04145 7.22741 6.13978C6.98198 6.23811 6.75904 6.3852 6.57208 6.57216C6.38512 6.75912 6.23803 6.98205 6.1397 7.22749C6.04137 7.47292 5.99385 7.73575 6 8.00008C5.99385 8.26441 6.04137 8.52724 6.1397 8.77267C6.23803 9.01811 6.38512 9.24105 6.57208 9.42801C6.75904 9.61496 6.98198 9.01811 9.42793 9.42801C9.61489 9.24105 9.76198 9.01811 9.86031 8.77267C9.95864 8.52724 10.0062 8.26441 10 8.00008C10.0062 7.73575 9.95864 7.47292 9.86031 7.22749C9.76198 6.98205 9.61489 6.75912 9.42793 6.57216C9.24097 6.3852 9.01803 6.23811 8.7726 6.13978C8.52716 6.04145 8.26433 5.99392 8 6.00008Z"></path></svg>
                      Settings
                    </button>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="flex flex-col mt-4 mb-6">
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
              {/* Services: table if populated, empty-state otherwise */}
              {services.length > 0 ? (
                <div className="w-full overflow-x-auto rounded-sm border border-gray-300 dark:border-[#525252]">
                  <table className="w-full border-collapse bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)] text-[15px] text-left whitespace-nowrap">
                    <thead className="border-b border-gray-300 dark:border-[#525252] text-gray-700 dark:text-[#e3e3e3] bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)]">
                      <tr>
                        <th scope="col" className="h-10 pl-6 pr-4 font-medium uppercase tracking-wider text-[13px] font-mono flex items-center gap-2">
                          Service Name
                          <span className="inline-flex items-center px-1.5 h-4 text-[11px] bg-[#ffffff1a] text-white rounded-sm tabular-nums font-sans">{services.length}</span>
                          <svg fill="currentColor" aria-hidden="true" className="shrink-0 w-3.5 h-3.5 transform rotate-180" width="16" height="16" viewBox="0 0 16 16"><path d="M12.295 8.295L8.5 12.085V2H7.5V12.085L3.705 8.295L3 9L8 14L13 9L12.295 8.295Z"></path></svg>
                        </th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[13px] font-mono">Status</th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[13px] font-mono">Runtime</th>
                        <th scope="col" className="h-10 px-4 font-medium uppercase tracking-wider text-[13px] font-mono">Updated</th>
                        <th scope="col" className="h-10 p-0 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#525252]">
                      {services.map(service => (
                        <tr 
                          key={service.id}
                          className="h-14 hover:bg-[#ffffff1a] transition-colors group cursor-pointer"
                          onClick={() => navigate(`/projects/${projectId}/services/${service.publicId || service.id}`)}
                        >
                          <td className="pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              {service.type === 'web' ? (
                                <svg fill="currentColor" className="w-5 h-5 text-[#8f8f8f] group-hover:text-white transition-colors shrink-0" width="16" height="16" viewBox="0 0 16 16"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
                              ) : (
                                <svg fill="currentColor" className="w-5 h-5 text-[#8f8f8f] group-hover:text-white transition-colors shrink-0" width="16" height="17" viewBox="0 0 16 17"><path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path><path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path></svg>
                              )}
                              <span className="text-[16px] font-medium text-white hover:underline underline-offset-2">
                                {service.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-[#ffffff1a] text-[#f0f0f0] border border-[#525252] text-[13px]">
                              <span className="w-2 h-2 rounded-full bg-green-400"></span>
                              Live
                            </span>
                          </td>
                          <td className="px-4 text-[15px] text-[#c7c7c7]">
                            {service.type === 'web' ? 'Docker' : 'Static'}
                          </td>
                          <td className="px-4 text-[15px] text-[#c7c7c7]">
                            {new Date(service.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-2 text-right">
                            <button className="h-8 w-8 inline-flex items-center justify-center text-[#8f8f8f] hover:text-white hover:bg-[#ffffff1a] rounded-sm transition-colors">
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex items-center border-t border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)]">
                    <button 
                      className="w-full flex items-center justify-start gap-2 h-14 px-6 text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-200 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-white transition-colors text-[15px] font-medium rounded-sm"
                      onClick={() => navigate(`/projects/${projectId}/services/new`)}
                    >
                      <svg fill="currentColor" width="18" height="18" viewBox="0 0 16 16"><path d="M8.5 7.5V2.5H7.5V7.5H2.5V8.5H7.5V13.5H8.5V8.5H13.5V7.5H8.5Z"></path></svg>
                      New service
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div className="flex items-center mx-auto w-full bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)] border border-gray-300 dark:border-[#525252] rounded-sm">
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
                          <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path>
                          </svg>
                        </div>
                        Create new service
                      </button>
                      <button
                        type="button"
                        className="h-10 py-2.5 px-3 border border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] font-medium text-[15px] transition-colors flex items-center rounded-sm"
                      >
                        <div className="inline-flex w-4 h-4 me-1.5">
                          <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5.705 13.295L3.915 11.5H14V10.5H3.915L5.705 8.705L5 8L2 11L5 14L5.705 13.295Z"></path>
                            <path d="M14 5L11 2L10.295 2.705L12.085 4.5H2V5.5H12.085L10.295 7.295L11 8L14 5Z"></path>
                          </svg>
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
          <div className="inline-block w-full text-left align-middle transform bg-[oklch(0.21_0.03_263.45)] shadow-2xl border border-[#4d4d4d] max-w-2xl rounded-sm">
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
                  <svg fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path>
                  </svg>
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
