import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Pencil } from 'lucide-react';
import {
  getEnvironments,
  type DeploymentEnvironment,
} from '../../services/environmentService';
import { getProject, type Project } from '../../services/projectService';

export default function ProjectEnvironments() {
  const { id } = useParams();
  const projectId = Number(id);
  const [project, setProject] = useState<Project>();
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isInteger(projectId) || projectId < 1) { 
      setLoading(false); 
      return; 
    }
    
    Promise.all([getProject(projectId), getEnvironments(projectId)])
      .then(([loadedProject, loadedEnvironments]) => {
        if (!loadedProject) throw new Error('Project not found.');
        setProject(loadedProject);
        setEnvironments(loadedEnvironments);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="p-12 text-[#b3b3b3]">Loading...</div>;
  }

  if (!project) {
    return <div className="p-12 text-red-400">Project not found</div>;
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#090909] text-white">
      
      {/* Header Section */}
      <div className="my-12 pb-12 border-b border-[#333]">
        <div className="w-full max-w-[1920px] mx-auto px-4 md:px-12 space-y-2 md:space-y-1">
          <div className="text-[14px] uppercase font-mono tracking-wider text-[#8f8f8f]">Project</div>
          <div className="md:min-h-10 flex flex-col md:flex-row items-start md:items-center md:justify-between gap-y-6 md:gap-y-0">
            
            {/* Title & Edit */}
            <div className="flex-1 pr-4">
              <Link
                to={`/projects/${projectId}/settings?edit=name`}
                className="group flex items-baseline justify-start gap-3 px-2 py-1.5 -mx-2 -my-1.5 hover:bg-transparent text-left"
                title="Edit project name"
              >
                <h1 className="m-0 text-[26px] md:text-[32px] font-medium text-white break-words">
                  {project.name}
                </h1>
                <Pencil className="w-4 h-4 text-[#8f8f8f] group-hover:text-white transition-colors" />
                <span className="sr-only">Edit project name</span>
              </Link>
              {project.description && (
                <div className="text-[#b3b3b3] mt-1 text-[15px] ml-1">
                  {project.description}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="inline-flex flex-wrap gap-4">
              <button 
                type="button"
                className="flex items-center gap-2 h-10 px-3 py-2.5 text-[14px] font-medium text-[#e3e3e3] hover:text-[#141414] hover:bg-white border border-[#6b6b6b] hover:border-transparent transition-colors group disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span className="mr-2">Add environment</span>
                <span className="inline-flex items-center px-2 h-6 text-[12px] bg-[#272727] text-white group-hover:bg-[#141414] group-hover:text-white transition-colors tabular-nums border border-transparent">
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
              <h2 className="flex items-center gap-2 text-[20px] font-medium text-[#f0f0f0]">
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
                        <button className="flex items-center gap-2 h-8 px-2 py-2 border border-l border-y border-[#3b82f6] text-white bg-[#2563eb] font-medium">
                          <span className="flex gap-1 capitalize">
                            <span>All</span>
                            <span>(0)</span>
                          </span>
                        </button>
                      </li>
                      <li>
                        <button className="flex items-center gap-2 h-8 px-2 py-2 border border-l border-y border-[#4d4d4d] text-[#c7c7c7] hover:bg-[#1e40af] hover:text-white hover:border-[#3b82f6] transition-colors">
                          <span className="flex gap-1 capitalize">
                            <span>Services</span>
                            <span>(0)</span>
                          </span>
                        </button>
                      </li>
                      <li>
                        <button className="flex items-center gap-2 h-8 px-2 py-2 border border-[#4d4d4d] text-[#c7c7c7] hover:bg-[#1e40af] hover:text-white hover:border-[#3b82f6] transition-colors">
                          <span className="flex gap-1 capitalize">
                            <span>Env Groups</span>
                            <span>(0)</span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Menu Button */}
                  <div className="flex">
                    <Link
                      to={`/projects/${projectId}/environments/${env.id}/configure`}
                      className="flex items-center justify-center h-10 w-10 text-[#c7c7c7] hover:text-white hover:bg-[#272727] transition-colors"
                      title="Configure environment"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="flex flex-col mt-4 mb-6">
                  <label htmlFor={`search-${env.id}`} className="sr-only">Search resources in {env.name}</label>
                  <div className="flex relative">
                    <Search className="absolute inset-y-0 my-auto w-4 h-4 text-[#8f8f8f] left-3 pointer-events-none" />
                    <input 
                      id={`search-${env.id}`}
                      placeholder={`Search resources in ${env.name}`}
                      spellCheck="false"
                      autoComplete="off"
                      className="truncate h-10 w-full pl-9 pr-3 py-2.5 bg-transparent border border-[#4d4d4d] hover:border-[#b3b3b3] focus:border-[#3b82f6] focus:outline-none text-white text-[14px] transition-colors placeholder:text-[#8f8f8f]"
                    />
                  </div>
                </div>
              </div>
              
              {/* Empty State */}
              <div className="flex items-center mx-auto w-full bg-[#141414] border border-[#333]">
                <div className="max-w-[500px] w-full py-20 px-4 mx-auto space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-[22px] font-medium text-white">{env.name} is empty</h3>
                    <p className="text-[15px] text-[#e3e3e3]">Kickstart your environment by creating a new service.</p>
                  </div>
                  <div className="inline-flex flex-wrap gap-2">
                    <button 
                      type="button" 
                      className="flex items-center gap-1.5 h-10 px-4 bg-white hover:bg-[#e3e3e3] text-black font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create new service
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
        
        {environments.length === 0 && (
          <div className="text-[#b3b3b3] italic pt-8 border-t border-[#333]">
            No environments configured for this project.
          </div>
        )}
        
        <div className="w-full border p-8 py-16 text-center border-dashed border-[#4d4d4d] bg-[#141414] cursor-pointer transition-all text-[#f0f0f0] hover:text-[#3b82f6] active:text-[#2563eb] rounded-sm mt-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 text-[15px] font-medium">
              <Plus className="w-5 h-5" />
              <span>Add environment</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
