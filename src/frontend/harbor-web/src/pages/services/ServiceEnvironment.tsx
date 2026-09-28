import { useState, useEffect, useRef } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { 
 Database, Copy, Eye, EyeOff, Download
} from 'lucide-react';
import { IoLogoGithub } from "react-icons/io";
import { LuExternalLink } from "react-icons/lu";
import { MdPublic, MdFiberNew } from "react-icons/md";
import { FiChevronDown } from 'react-icons/fi';
import { motion } from 'motion/react';
import { DeployModal } from './ServiceDetails';
import { Icon } from '../../components/icons';

export default function ServiceEnvironment() {
 const { projectId } = useParams();
 const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
 const service = context?.service;
 
 // Header state
 const [deployMenuOpen, setDeployMenuOpen] = useState(false);
 const [deployMode, setDeployMode] = useState<'latest' | 'specific'>('latest');
 const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
 const deployMenuRef = useRef<HTMLDivElement>(null);
 
 const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
 };
 
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

 // Environment Variables State
 const [isEditingVars, setIsEditingVars] = useState(false);
 const [envVars, setEnvVars] = useState<{key: string, value: string}[]>([]);
 const [editingVars, setEditingVars] = useState<{key: string, value: string}[]>([]);

 // Environment Secrets State
 const [isEditingSecrets, setIsEditingSecrets] = useState(false);
 const [envSecrets, setEnvSecrets] = useState<{key: string, value: string}[]>([]);
 const [editingSecrets, setEditingSecrets] = useState<{key: string, value: string}[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});

 const handleEditVars = () => {
  setEditingVars([...envVars]);
  setIsEditingVars(true);
 };
 
 const handleSaveVars = () => {
  setEnvVars([...editingVars]);
  setIsEditingVars(false);
 };

 const handleCancelVars = () => {
  setIsEditingVars(false);
 };
 
 const addVar = () => setEditingVars([...editingVars, { key: '', value: '' }]);
 const removeVar = (index: number) => {
  const newVars = [...editingVars];
  newVars.splice(index, 1);
  setEditingVars(newVars);
 };

 const handleEditSecrets = () => {
  setEditingSecrets([...envSecrets]);
  setIsEditingSecrets(true);
 };
 
 const handleSaveSecrets = () => {
  setEnvSecrets([...editingSecrets]);
  setIsEditingSecrets(false);
 };

 const handleCancelSecrets = () => {
  setIsEditingSecrets(false);
 };
 
 const addSecret = () => setEditingSecrets([...editingSecrets, { key: '', value: '' }]);
 const removeSecret = (index: number) => {
  const newSecrets = [...editingSecrets];
  newSecrets.splice(index, 1);
  setEditingSecrets(newSecrets);
 };

  const toggleSecretVisibility = (index: number) => {
   setVisibleSecrets(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
  <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto pb-20">
   {/* Deploy Modal */}
   {isDeployModalOpen && service && projectId && (
    <DeployModal
     service={service}
     projectId={projectId}
     mode={deployMode}
     onClose={() => setIsDeployModalOpen(false)}
     onDeployed={() => {
      // handle deployment triggered
     }}
    />
   )}

   {/* Header Area */}
   {service && (
    <div className="pt-8 border-b border-gray-300 dark:border-[#525252]">
     <header className="px-4 md:px-12 space-y-4">
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
        <h1 className="flex flex-wrap items-center gap-4 text-3xl font-medium text-gray-900 dark:text-white pr-4">
         <div className="min-w-0 break-words">{service.name}</div>
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
              <Icon name="lock" className="w-3.5 h-3.5 text-gray-500 dark:text-[#b3b3b3]" />
             ) : (
              <MdPublic className="w-4 h-4 text-gray-500 dark:text-[#b3b3b3]" />
             )}
            </span>
            <div className="flex items-center gap-1.5 border-l border-gray-300 dark:border-[#525252] pl-4">
             <Icon name="fileText" className="w-3.5 h-3.5 shrink-0 text-gray-900 dark:text-white" aria-hidden="true" />
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

   <main className="px-4 md:px-12 mt-8 space-y-6">
    <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-6">
     <Database className="w-5 h-5 text-gray-500" />
     Environment
    </h2>

    {/* Environment Variables Block */}
    <div id="environment-variables" className="p-6 md:p-8 bg-white dark:bg-[#0b1221] border border-solid border-gray-300 dark:border-[#525252] rounded-md scroll-mt-20">
     <div className="mb-8">
      <div className="flex justify-between flex-col md:flex-row gap-y-6">
       <div className="flex-1 md:pr-4">
        <h4 className="text-gray-900 dark:text-white text-lg font-medium">Environment Variables</h4>
        <div className="text-sm text-gray-500 dark:text-[#c7c7c7] mt-1 max-w-xl">
         Set environment-specific config and secrets (such as API keys), then read those values from your code.{' '}
         <a rel="noopener noreferrer" target="_blank" className="text-gray-900 dark:text-[#d1b8ff] underline hover:no-underline font-medium" href="https://render.com/docs/configure-environment-variables">
          Learn more.
         </a>
        </div>
       </div>
        <div>
         {!isEditingVars && envVars.length > 0 && (
          <div className="inline-flex flex-wrap gap-2">
           <button className="h-10 px-3 inline-flex items-center justify-center border border-solid border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] transition-colors rounded-none text-sm font-medium">
            <Download className="w-4 h-4" />
           </button>
           <button className="h-10 px-3 inline-flex items-center justify-center border border-solid border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] transition-colors rounded-none text-sm font-medium">
            <Copy className="w-4 h-4" />
           </button>
           <button
            onClick={handleEditVars}
            className="h-10 px-3 inline-flex items-center justify-center border border-solid border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] transition-colors rounded-none text-sm font-medium"
           >
            Edit
           </button>
          </div>
         )}
        </div>
      </div>
     </div>
     
     <div className="text-[14px] text-gray-900 dark:text-[#f0f0f0]">
      {isEditingVars || envVars.length > 0 ? (
       <form noValidate className="[container-type:inline-size]">
        <table className="w-full">
         <thead role="rowgroup" className="w-full table border-solid border-gray-300 dark:border-[#4d4d4d] border-t border-x">
          <tr>
           <th scope="col" className="py-3 pr-4 pl-4 text-[12px] uppercase tracking-wider text-gray-900 dark:text-[#f0f0f0] font-mono text-left w-[33%]">Key</th>
           <th scope="col" className="py-3 pr-4 pl-0 text-[12px] uppercase tracking-wider text-gray-900 dark:text-[#f0f0f0] font-mono text-left">Value</th>
           <th scope="col" className="py-3 pr-4 pl-0 text-[14px] font-semibold text-left w-[1px]">
            <span className="sr-only">Delete</span>
           </th>
          </tr>
         </thead>
         <tbody role="rowgroup" className="w-full block border-solid border-gray-300 dark:border-[#4d4d4d] border">
          {(isEditingVars ? editingVars : envVars).map((v, idx) => (
           <tr role="row" key={idx} className="w-full table border-b border-gray-200 dark:border-[#4d4d4d] last:border-0">
            <th scope="row" className="align-top pt-4 pb-4 pr-4 pl-4 w-[33%]">
             <div className="scroll-mt-16 scroll-mb-2">
              <div className="flex flex-col">
               <label className="inline-block text-[12px] text-gray-900 dark:text-[#f0f0f0] mb-2 sr-only">Key</label>
               <div className="flex relative">
                <input 
                 placeholder="NAME_OF_VARIABLE" 
                 value={v.key}
                 onChange={(e) => {
                  const newVars = [...editingVars];
                  newVars[idx].key = e.target.value;
                  setEditingVars(newVars);
                 }}
                 className="h-10 truncate font-mono text-[13px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] border border-solid dark:border-[#6b6b6b] hover:dark:border-[#b3b3b3] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0]" 
                 type="text" 
                />
               </div>
              </div>
             </div>
            </th>
            <td className="align-top pt-4 pb-4 pr-4 pl-0">
             <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
              <div className="flex flex-col w-full">
               <label className="inline-block text-[12px] text-gray-900 dark:text-[#f0f0f0] mb-2 sr-only">Value</label>
               <div className="flex relative">
                <textarea 
                 rows={1} 
                 placeholder="value" 
                 value={v.value}
                 onChange={(e) => {
                  const newVars = [...editingVars];
                  newVars[idx].value = e.target.value;
                  setEditingVars(newVars);
                 }}
                 className="font-mono text-[13px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] border border-solid dark:border-[#6b6b6b] hover:dark:border-[#b3b3b3] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] h-10 min-h-[40px] max-h-[40px] py-2.5 overflow-hidden resize-none"
                />
               </div>
              </div>
              <div className="flex items-center space-x-2 justify-start min-w-[100px]">
              </div>
             </div>
            </td>
            <td className="align-top pt-4 pb-4 pr-4 pl-0 w-[1px]">
             <div>
              {isEditingVars && <button onClick={() => removeVar(idx)} type="button" className="text-red-600 dark:text-[#f0989e] hover:text-red-700 dark:hover:text-[#000] hover:bg-red-50 dark:hover:bg-[#f4b3b7] active:bg-red-100 dark:active:bg-[#fad1d3] h-10 py-2.5 px-3 flex items-center group/button transition-colors">
               <Icon name="trash" aria-label="Delete" />
              </button>}
             </div>
            </td>
           </tr>
          ))}
         </tbody>
        </table>
        
        {isEditingVars && <div className="mt-10 flex justify-between gap-y-10 flex-col gap-x-4 [@container(min-width:50rem)]:flex-row">
         <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex">
           <button type="button" onClick={addVar} className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add variable
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
         </div>
         <div className="flex flex-wrap gap-3 items-start">
          <div className="inline-flex">
           <button onClick={handleSaveVars} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            Save only
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">Choose an option</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
          <button onClick={handleCancelVars} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
           Cancel
          </button>
         </div>
        </div>}
       </form>
      ) : (
       <form noValidate className="[container-type:inline-size]">
        <div className="flex justify-between gap-y-10 flex-col gap-x-4 [@container(min-width:50rem)]:flex-row">
         <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex">
           <button 
            type="button" 
            onClick={() => {
             setEditingVars([{ key: '', value: '' }]);
             setIsEditingVars(true);
            }} 
            className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button text-sm font-medium transition-colors"
           >
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add variable
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
         </div>
        </div>
       </form>
      )}
     </div>
    </div>

    {/* Environment Secrets Block */}
    <div id="environment-secrets" className="p-6 md:p-8 bg-white dark:bg-[#0b1221] border border-solid border-gray-300 dark:border-[#525252] rounded-md scroll-mt-20">
     <div className="mb-8">
      <div className="flex justify-between flex-col md:flex-row gap-y-6">
       <div className="flex-1 md:pr-4">
        <h4 className="text-gray-900 dark:text-white text-lg font-medium">Environment Secrets</h4>
        <div className="text-sm text-gray-500 dark:text-[#c7c7c7] mt-1 max-w-xl">
         These secrets are encrypted at rest and injected securely at runtime.{' '}
         <a rel="noopener noreferrer" target="_blank" className="text-gray-900 dark:text-[#d1b8ff] underline hover:no-underline font-medium" href="https://render.com/docs/configure-environment-variables">
          Learn more.
         </a>
        </div>
       </div>
        <div>
         {!isEditingSecrets && envSecrets.length > 0 && (
          <div className="inline-flex flex-wrap gap-2">
           <button
            onClick={handleEditSecrets}
            className="h-10 px-3 inline-flex items-center justify-center border border-solid border-gray-300 dark:border-[#fff6] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] transition-colors rounded-none text-sm font-medium"
           >
            Edit
           </button>
          </div>
         )}
        </div>
      </div>
     </div>
     
     <div className="text-[14px] text-gray-900 dark:text-[#f0f0f0]">
      {isEditingSecrets || envSecrets.length > 0 ? (
       <form noValidate className="[container-type:inline-size]">
        <table className="w-full">
         <thead role="rowgroup" className="w-full table border-solid border-gray-300 dark:border-[#4d4d4d] border-t border-x">
          <tr>
           <th scope="col" className="py-3 pr-4 pl-4 text-[12px] uppercase tracking-wider text-gray-900 dark:text-[#f0f0f0] font-mono text-left w-[33%]">Key</th>
           <th scope="col" className="py-3 pr-4 pl-0 text-[12px] uppercase tracking-wider text-gray-900 dark:text-[#f0f0f0] font-mono text-left">Value</th>
           <th scope="col" className="py-3 pr-4 pl-0 text-[14px] font-semibold text-left w-[1px]">
            <span className="sr-only">Delete</span>
           </th>
          </tr>
         </thead>
         <tbody role="rowgroup" className="w-full block border-solid border-gray-300 dark:border-[#4d4d4d] border">
          {(isEditingSecrets ? editingSecrets : envSecrets).map((v, idx) => (
           <tr role="row" key={idx} className="w-full table border-b border-gray-200 dark:border-[#4d4d4d] last:border-0">
            <th scope="row" className="align-top pt-4 pb-4 pr-4 pl-4 w-[33%]">
             <div className="scroll-mt-16 scroll-mb-2">
              <div className="flex flex-col">
               <label className="inline-block text-[12px] text-gray-900 dark:text-[#f0f0f0] mb-2 sr-only">Key</label>
               <div className="flex relative">
                <input 
                 placeholder="NAME_OF_SECRET" 
                 value={v.key}
                 onChange={(e) => {
                  const newSecrets = [...editingSecrets];
                  newSecrets[idx].key = e.target.value;
                  setEditingSecrets(newSecrets);
                 }}
                 className="h-10 truncate font-mono text-[13px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] border border-solid dark:border-[#6b6b6b] hover:dark:border-[#b3b3b3] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0]" 
                 type="text" 
                />
               </div>
              </div>
             </div>
            </th>
            <td className="align-top pt-4 pb-4 pr-4 pl-0">
             <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
              <div className="flex flex-col w-full">
               <label className="inline-block text-[12px] text-gray-900 dark:text-[#f0f0f0] mb-2 sr-only">Value</label>
               <div className="flex relative">
                <textarea 
                 rows={1} 
                 placeholder="value" 
                 value={v.value}
                 onChange={(e) => {
                  const newSecrets = [...editingSecrets];
                  newSecrets[idx].value = e.target.value;
                  setEditingSecrets(newSecrets);
                 }}
                 className="font-mono text-[13px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] border border-solid dark:border-[#6b6b6b] hover:dark:border-[#b3b3b3] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] h-10 min-h-[40px] max-h-[40px] py-2.5 overflow-hidden resize-none [&[data-state=hidden]]:text-transparent [&[data-state=hidden]]:placeholder-transparent"
                 data-state={visibleSecrets[idx] ? 'visible' : 'hidden'}
                />
               </div>
              </div>
              <div className="flex items-center space-x-2 justify-start min-w-[100px]">
               <button type="button" className="text-blue-600 dark:text-[#d1b8ff] hover:bg-blue-50 dark:hover:bg-[#ffffff1a] h-10 py-2.5 px-3 flex items-center group/button transition-colors font-medium text-sm">
                <div className="inline-flex w-4 h-4 me-1.5">
                 <Icon name="openExternal" />
                </div>
                Generate
               </button>
              </div>
             </div>
            </td>
            <td className="align-top pt-4 pb-4 pr-4 pl-0 w-[1px]">
             <div className="flex items-center">
              <button onClick={() => toggleSecretVisibility(idx)} type="button" className="text-gray-400 dark:text-[#8f8f8f] hover:text-gray-700 dark:hover:text-[#c7c7c7] h-10 py-2.5 px-3 flex items-center transition-colors">
               {visibleSecrets[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {isEditingSecrets && <button onClick={() => removeSecret(idx)} type="button" className="text-red-600 dark:text-[#f0989e] hover:text-red-700 dark:hover:text-[#000] hover:bg-red-50 dark:hover:bg-[#f4b3b7] active:bg-red-100 dark:active:bg-[#fad1d3] h-10 py-2.5 px-3 flex items-center group/button transition-colors">
               <Icon name="trash" aria-label="Delete" />
              </button>}
             </div>
            </td>
           </tr>
          ))}
         </tbody>
        </table>
        
        {isEditingSecrets && <div className="mt-10 flex justify-between gap-y-10 flex-col gap-x-4 [@container(min-width:50rem)]:flex-row">
         <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex">
           <button type="button" onClick={addSecret} className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add secret
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
         </div>
         <div className="flex flex-wrap gap-3 items-start">
          <div className="inline-flex">
           <button onClick={handleSaveSecrets} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            Save only
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">Choose an option</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
          <button onClick={handleCancelSecrets} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
           Cancel
          </button>
         </div>
        </div>}
       </form>
      ) : (
       <form noValidate className="[container-type:inline-size]">
        <div className="flex justify-between gap-y-10 flex-col gap-x-4 [@container(min-width:50rem)]:flex-row">
         <div className="flex flex-wrap gap-2 items-center">
          <div className="inline-flex">
           <button 
            type="button" 
            onClick={() => {
             setEditingSecrets([{ key: '', value: '' }]);
             setIsEditingSecrets(true);
            }} 
            className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button text-sm font-medium transition-colors"
           >
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add secret
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <Icon name="chevronDown" className="w-4 h-4 motion-safe:transition-transform" aria-hidden="true" />
           </button>
          </div>
         </div>
        </div>
       </form>
      )}
     </div>
     </div>

    </main>
   </div>
  );
}
