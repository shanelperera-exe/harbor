import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Database, Copy, Eye, EyeOff, Download
} from 'lucide-react';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import {
  getEnvironments,
  getEnvironmentConfiguration,
  saveEnvironmentConfiguration,
  type DeploymentEnvironment,
  type EnvironmentConfiguration,
} from '../../services/environmentService';

export default function ServiceEnvironment() {
 const { projectId } = useParams();
 const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
 const service = context?.service;

 // Environment Variables State
 const [isEditingVars, setIsEditingVars] = useState(false);
 const [envVars, setEnvVars] = useState<{key: string, value: string}[]>([]);
 const [editingVars, setEditingVars] = useState<{key: string, value: string}[]>([]);

 // Environment Secrets State
 const [isEditingSecrets, setIsEditingSecrets] = useState(false);
 const [envSecrets, setEnvSecrets] = useState<{key: string, value: string}[]>([]);
 const [editingSecrets, setEditingSecrets] = useState<{key: string, value: string}[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});

  // Environment configuration state
  const [environmentId, setEnvironmentId] = useState<number | null>(null);
  const [envConfig, setEnvConfig] = useState<EnvironmentConfiguration | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [secretIsSet, setSecretIsSet] = useState<Record<number, boolean>>({});

   const fetchEnvironmentConfig = useCallback(async () => {
    if (!projectId || !service) return;

    setLoadingConfig(true);
    setConfigError(null);
    try {
      const envs = await getEnvironments(projectId);
      const envName = service.deploymentUrls?.[0]?.environment || 'Production';
      const matchedEnv: DeploymentEnvironment | undefined = envs.find(
        (e) => e.name.toLowerCase() === envName.toLowerCase(),
      );

      if (matchedEnv) {
        setEnvironmentId(matchedEnv.id);
        const config = await getEnvironmentConfiguration(projectId, matchedEnv.id);
        setEnvConfig(config);
        setEnvVars(
          config.configuration.map((c) => ({ key: c.key, value: c.value })),
        );
        setEnvSecrets(
          config.secureValues.map((s) => ({ key: s.key, value: '' })),
        );
        setSecretIsSet(
          config.secureValues.reduce(
            (acc, s, idx) => ({ ...acc, [idx]: s.isSet }),
            {},
          ),
        );
      } else {
        setEnvironmentId(null);
        setEnvConfig(null);
        setEnvVars([]);
        setEnvSecrets([]);
        setSecretIsSet({});
      }
    } catch (err) {
      setConfigError(
        err instanceof Error ? err.message : 'Failed to load environment configuration.',
      );
    } finally {
      setLoadingConfig(false);
    }
  }, [projectId, service]);

  const handleEditVars = () => {
   setEditingVars([...envVars]);
   setIsEditingVars(true);
  };
  
  const handleSaveVars = async () => {
    setSaveError(null);
    if (!projectId || !environmentId) {
     setSaveError('Environment not found. Unable to save.');
     return;
    }
    try {
      const deploymentUrl = envConfig?.deploymentUrl || service?.deploymentUrl || '';
      const provider = envConfig?.provider || service?.provider || '';
      await saveEnvironmentConfiguration(projectId, environmentId, {
        deploymentUrl,
        provider,
        configuration: editingVars
          .filter((v) => v.key.trim())
          .map((v) => ({ key: v.key.trim(), value: v.value.trim() })),
        secureValues: envSecrets.map((s) => ({ key: s.key, value: '' })),
      });
      await fetchEnvironmentConfig();
      setIsEditingVars(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save environment variables.',
      );
    }
  };

  const handleCancelVars = () => {
   setEditingVars([...envVars]);
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
 
  const handleSaveSecrets = async () => {
    setSaveError(null);
    if (!projectId || !environmentId) {
     setSaveError('Environment not found. Unable to save.');
     return;
    }
    try {
      const deploymentUrl = envConfig?.deploymentUrl || service?.deploymentUrl || '';
      const provider = envConfig?.provider || service?.provider || '';
      await saveEnvironmentConfiguration(projectId, environmentId, {
        deploymentUrl,
        provider,
        configuration: envVars,
        secureValues: editingSecrets
          .filter((s) => s.key.trim())
          .map((s) => ({ key: s.key.trim(), value: s.value.trim() })),
      });
      await fetchEnvironmentConfig();
      setIsEditingSecrets(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Failed to save environment secrets.',
      );
    }
  };

  const handleCancelSecrets = () => {
   setEditingSecrets([...envSecrets]);
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

  // Fetch environment configuration when service changes
  useEffect(() => {
    void fetchEnvironmentConfig();
  }, [projectId, service]);

  return (
  <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto pb-20">
   <ServiceHeader />

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
      
      {configError && (
       <div className="mb-4 text-sm text-red-500">
        {configError}
       </div>
      )}
      {saveError && (
       <div className="mb-4 text-sm text-red-500">
        {saveError}
       </div>
      )}

      {loadingConfig ? (
       <div className="py-8 text-center text-gray-500 dark:text-[#8f8f8f] text-sm">
        Loading environment variables…
       </div>
      ) : (
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
           <button type="button" onClick={addVar} className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add variable
           </button>
          </div>
          <div className="flex flex-wrap gap-3 items-start">
           <button onClick={handleSaveVars} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            Save
           </button>
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
          </div>
         </div>
        </form>
       )}
      </div>
       )}
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
      
      {loadingConfig ? (
       <div className="py-8 text-center text-gray-500 dark:text-[#8f8f8f] text-sm">
        Loading environment secrets…
       </div>
      ) : (
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
                 {isEditingSecrets ? (
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
                 ) : (
                  <div 
                    className="font-mono text-[13px] w-full m-0 px-3 py-2.5 bg-transparent border border-solid dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] h-10 min-h-[40px] max-h-[40px] overflow-hidden resize-none cursor-default"
                    data-state={visibleSecrets[idx] ? 'visible' : 'hidden'}
                  >
                    {secretIsSet[idx] ? (visibleSecrets[idx] ? v.value || '••••••••••' : '•'.repeat(Math.max(2, v.value?.length || 8)) ) : 'Not set'}
                  </div>
                 )}
                </div>
               </div>
               <div className="flex items-center space-x-2 justify-start min-w-[100px]">
                {isEditingSecrets && (
                 <button type="button" className="text-blue-600 dark:text-[#d1b8ff] hover:bg-blue-50 dark:hover:bg-[#ffffff1a] h-10 py-2.5 px-3 flex items-center group/button transition-colors font-medium text-sm">
                  <div className="inline-flex w-4 h-4 me-1.5">
                   <Icon name="openExternal" />
                  </div>
                  Generate
                 </button>
                )}
               </div>
              </div>
             </td>
             <td className="align-top pt-4 pb-4 pr-4 pl-0 w-[1px]">
              <div className="flex items-center">
               {isEditingSecrets && (
                <button onClick={() => toggleSecretVisibility(idx)} type="button" className="text-gray-400 dark:text-[#8f8f8f] hover:text-gray-700 dark:hover:text-[#c7c7c7] h-10 py-2.5 px-3 flex items-center transition-colors">
                 {visibleSecrets[idx] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
               )}
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
           <button type="button" onClick={addSecret} className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            <div className="inline-flex w-4 h-4 me-1.5">
             <Icon name="plus" />
            </div>
            Add secret
           </button>
          </div>
          <div className="flex flex-wrap gap-3 items-start">
           <button onClick={handleSaveSecrets} type="button" className="text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[#141414] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 flex items-center group/button transition-colors text-sm font-medium">
            Save
           </button>
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
          </div>
         </div>
        </form>
       )}
      </div>
       )}
      </div>

     </main>
   </div>
  );
}
