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
           <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="w-4 h-4 text-gray-500 shrink-0"><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
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
               <svg fill="currentColor" aria-label="Delete" width="16" height="17" viewBox="0 0 16 17">
                <path d="M7 6.66699H6V12.667H7V6.66699Z"></path>
                <path d="M10 6.66699H9V12.667H10V6.66699Z"></path>
                <path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path>
                <path d="M10 1.66699H6V2.66699H10V1.66699Z"></path>
               </svg>
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
             <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
            </div>
            Add variable
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
             <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
            </div>
            Add variable
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
                 <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16">
                  <path d="M14.7071 12L6.00001 3.29294C5.80955 3.11108 5.55633 3.0096 5.29299 3.0096C5.02964 3.0096 4.77643 3.11108 4.58596 3.29294L3.29296 4.58594C3.10573 4.77361 3.00059 5.02787 3.00059 5.29297C3.00059 5.55806 3.10573 5.81232 3.29296 5.99999L11.9995 14.707C12.1872 14.8942 12.4415 14.9994 12.7065 14.9994C12.9716 14.9994 13.2259 14.8942 13.4136 14.707L14.7071 13.4138C14.7999 13.321 14.8736 13.2107 14.9239 13.0894C14.9741 12.9681 15 12.8381 15 12.7068C15 12.5754 14.9741 12.4454 14.9239 12.3241C14.8736 12.2028 14.7999 12.0928 14.7071 12ZM4.00001 5.29294L5.29296 3.99999L7.79296 6.49999L6.49966 7.79344L3.99966 5.29344L4.00001 5.29294ZM12.7066 14L7.20656 8.50049L8.50001 7.20704L14 12.707L12.7066 14Z"></path>
                  <path d="M2.00003 6.99999L1.00004 7.99998L2.00003 8.99997L3.00002 7.99998L2.00003 6.99999Z"></path>
                  <path d="M8.00003 1.00001L7.00004 2L8.00003 2.99999L9.00002 2L8.00003 1.00001Z"></path>
                  <path d="M1.99999 1L1 1.99999L1.99999 2.99998L2.99998 1.99999L1.99999 1Z"></path>
                 </svg>
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
               <svg fill="currentColor" aria-label="Delete" width="16" height="17" viewBox="0 0 16 17">
                <path d="M7 6.66699H6V12.667H7V6.66699Z"></path>
                <path d="M10 6.66699H9V12.667H10V6.66699Z"></path>
                <path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path>
                <path d="M10 1.66699H6V2.66699H10V1.66699Z"></path>
               </svg>
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
             <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
            </div>
            Add secret
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
             <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
            </div>
            Add secret
           </button>
           <button type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center border-l-0 group/button transition-colors">
            <span className="sr-only">More options</span>
            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 motion-safe:transition-transform" width="16" height="16" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
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
