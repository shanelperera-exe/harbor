import { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import {
  Copy, Download
} from 'lucide-react';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';
import {
  getEnvironments,
  getEnvironmentConfiguration,
  saveEnvironmentConfiguration,
  type DeploymentEnvironment,
  type EnvironmentConfiguration,
} from '../../services/environmentService';

// Shared class names — kept in sync with the env UI in NewServiceConfigure.tsx
const cardClass =
  'p-6 md:p-8 bg-transparent dark:bg-[oklch(0.21_0.03_263.45)] border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm scroll-mt-20';
const titleClass =
  "text-gray-900 dark:text-white text-[18px] font-semibold font-['Roobert',sans-serif]";
const descriptionClass =
  "text-[16px] leading-[24px] text-gray-600 dark:text-[#c7c7c7] mt-1 max-w-xl font-['Neue_Montreal',sans-serif]";
const linkClass =
  'font-inherit text-[#2563eb] hover:text-[#1d4ed8] active:text-[#1e3a8a] hover:underline relative no-underline outline-none ml-1';
const bodyClass =
  "text-[16px] leading-[24px] text-gray-900 dark:text-[#f0f0f0] font-['Neue_Montreal',sans-serif]";
const tableWrapperClass =
  'border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm overflow-hidden';
const keyHeaderClass =
  'w-1/3 py-3 pl-7 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]';
const valueHeaderClass =
  'py-3 pl-2 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]';
const keyCellClass = 'w-1/3 p-4 pt-0 align-top [tr:first-of-type_>_&]:pt-4';
const valueCellClass = 'pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4';
const deleteCellClass = 'w-px pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4';
const keyInputClass =
  'h-10 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb]';
const valueInputClass =
  'h-10 font-mono text-[16px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb] min-h-10 py-2';
const iconButtonClass =
  'text-[16px] text-gray-600 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-[#f0f0f0] active:bg-gray-200 dark:active:bg-[#fff3] active:text-gray-900 dark:active:text-[#fff] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors';
const deleteButtonClass =
  'text-[16px] bg-transparent text-red-500 dark:text-[#f0989e] hover:bg-red-600 hover:text-white dark:hover:bg-[#f4b3b7] dark:hover:text-[#000] active:bg-red-700 dark:active:bg-[#fad1d3] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors';
const actionButtonClass =
  'text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-50 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] active:bg-gray-100 dark:active:bg-[#fff] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 outline-none flex items-center justify-center group/button transition-colors rounded-sm';

export default function ServiceEnvironment() {
 const { projectId } = useParams();
 const context = useOutletContext<{ service: any; deployRefreshKey: number }>();
 const service = context?.service;

 // Environment Variables State
 const [isEditingVars, setIsEditingVars] = useState(false);
 const [envVars, setEnvVars] = useState<{key: string, value: string}[]>([]);
 const [editingVars, setEditingVars] = useState<{key: string, value: string}[]>([]);
  const [visibleVars, setVisibleVars] = useState<Record<number, boolean>>({});

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
          config.secureValues.map((s) => ({ key: s.key, value: s.value || '' })),
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
   setEditingVars(envVars.map((v) => ({ ...v })));
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
   setEditingVars(envVars.map((v) => ({ ...v })));
   setIsEditingVars(false);
  };
 
 const addVar = () => setEditingVars([...editingVars, { key: '', value: '' }]);
 const removeVar = (index: number) => {
  const newVars = [...editingVars];
  newVars.splice(index, 1);
  setEditingVars(newVars);
 };
  const updateVar = (index: number, field: 'key' | 'value', val: string) => {
   setEditingVars((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)));
  };

 const handleEditSecrets = () => {
  setEditingSecrets(envSecrets.map((s) => ({ ...s })));
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
   setEditingSecrets(envSecrets.map((s) => ({ ...s })));
   setIsEditingSecrets(false);
  };
 
 const addSecret = () => setEditingSecrets([...editingSecrets, { key: '', value: '' }]);
 const removeSecret = (index: number) => {
  const newSecrets = [...editingSecrets];
  newSecrets.splice(index, 1);
  setEditingSecrets(newSecrets);
 };
  const updateSecret = (index: number, field: 'key' | 'value', val: string) => {
   setEditingSecrets((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: val } : s)));
  };

  const toggleVarVisibility = (index: number) => {
   setVisibleVars(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const toggleSecretVisibility = (index: number) => {
   setVisibleSecrets(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // Fetch environment configuration when service changes
  useEffect(() => {
    void fetchEnvironmentConfig();
  }, [projectId, service]);

  const varsToShow = isEditingVars ? editingVars : envVars;
  const secretsToShow = isEditingSecrets ? editingSecrets : envSecrets;

  return (
  <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto pb-20">
   <ServiceHeader />

    <main className="px-4 md:px-12 mt-8 space-y-6">
    <SectionTitle
     icon={<Icon name="sliders" />}
     title="Environment"
     description="Variables and secrets injected into this service at build and runtime."
    />

    {/* Environment Variables Block */}
    <div id="environment-variables" className={cardClass}>
     <div className="mb-8">
      <div className="flex justify-between flex-col md:flex-row gap-y-6">
       <div className="flex-1 md:pr-4">
        <h4 className={titleClass}>Environment Variables</h4>
        <div className={descriptionClass}>
         Set environment-specific config and secrets (such as API keys), then read those values from your code.
         <a rel="noopener noreferrer" target="_blank" className={linkClass} href="https://render.com/docs/configure-environment-variables">
          Learn more.
         </a>
        </div>
       </div>
        <div>
         {!isEditingVars && envVars.length > 0 && (
          <div className="inline-flex flex-wrap gap-3">
           <button type="button" aria-label="Download" className={actionButtonClass}>
            <Download className="w-4 h-4" />
           </button>
           <button type="button" aria-label="Copy" className={actionButtonClass}>
            <Copy className="w-4 h-4" />
           </button>
           <button type="button" onClick={handleEditVars} className={actionButtonClass}>
            <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
            Edit
           </button>
          </div>
         )}
        </div>
      </div>
      </div>
      
      {configError && (
       <div className="mb-4 text-[14px] text-red-500">
        {configError}
       </div>
      )}
      {saveError && (
       <div className="mb-4 text-[14px] text-red-500">
        {saveError}
       </div>
      )}

      {loadingConfig ? (
       <div className="py-8 text-center text-gray-500 dark:text-[#8f8f8f] text-[14px]">
        Loading environment variables…
       </div>
      ) : (
       <div className={bodyClass}>
        <form noValidate onSubmit={(e) => e.preventDefault()}>
         {varsToShow.length > 0 && (
          <div className={tableWrapperClass}>
           <table className="w-full">
            <thead className="border-b border-solid border-gray-300 dark:border-[#4d4d4d]">
             <tr>
              <th scope="col" className={keyHeaderClass}>Key</th>
              <th scope="col" className={valueHeaderClass}>Value</th>
              <th scope="col" className="w-px pr-4"><span className="sr-only">Delete</span></th>
             </tr>
            </thead>
            <tbody>
             {varsToShow.map((v, idx) => (
              <tr key={idx}>
               <td className={keyCellClass}>
                <div className="flex flex-col">
                 <label htmlFor={`env-key-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Key</label>
                 <div className="flex relative">
                  <input
                   id={`env-key-${idx}`}
                   placeholder="NAME_OF_VARIABLE"
                   type="text"
                   value={v.key}
                   readOnly={!isEditingVars}
                   onChange={(e) => updateVar(idx, 'key', e.target.value)}
                   className={keyInputClass}
                  />
                 </div>
                </div>
               </td>
               <td className={valueCellClass}>
                <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
                 <div className="flex flex-col w-full">
                  <label htmlFor={`env-value-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Value</label>
                  <div className="flex relative">
                   <input
                    id={`env-value-${idx}`}
                    type={visibleVars[idx] ? 'text' : 'password'}
                    placeholder="value"
                    dir="auto"
                    autoComplete="off"
                    spellCheck={false}
                    value={v.value}
                    readOnly={!isEditingVars}
                    onChange={(e) => updateVar(idx, 'value', e.target.value)}
                    className={valueInputClass}
                   />
                  </div>
                 </div>
                 <div className="flex items-center space-x-2 justify-start">
                  <button type="button" aria-label="Toggle value visibility" onClick={() => toggleVarVisibility(idx)} className={iconButtonClass}>
                   {visibleVars[idx] ? <Icon name="eyeOff" aria-hidden="true" /> : <Icon name="eye" />}
                  </button>
                 </div>
                </div>
               </td>
               <td className={deleteCellClass}>
                {isEditingVars && (
                 <button onClick={() => removeVar(idx)} type="button" aria-label="Delete" className={deleteButtonClass}>
                  <Icon name="trash" />
                 </button>
                )}
               </td>
              </tr>
             ))}
            </tbody>
           </table>
          </div>
         )}

         {isEditingVars ? (
          <div className={`${varsToShow.length > 0 ? 'mt-5' : ''} flex flex-col md:flex-row justify-between gap-3`}>
           <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addVar} className={actionButtonClass}>
             <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>
             Add Environment Variable
            </button>
           </div>
           <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSaveVars} className={actionButtonClass}>
             Save
            </button>
            <button type="button" onClick={handleCancelVars} className={actionButtonClass}>
             Cancel
            </button>
           </div>
          </div>
         ) : envVars.length === 0 && (
          <div className="flex flex-wrap gap-3">
           <button
            type="button"
            onClick={() => {
             setEditingVars([{ key: '', value: '' }]);
             setIsEditingVars(true);
            }}
            className={actionButtonClass}
           >
            <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>
            Add Environment Variable
           </button>
          </div>
         )}
        </form>
       </div>
      )}
     </div>

     {/* Environment Secrets Block */}
    <div id="environment-secrets" className={cardClass}>
     <div className="mb-8">
      <div className="flex justify-between flex-col md:flex-row gap-y-6">
       <div className="flex-1 md:pr-4">
        <h4 className={titleClass}>Environment Secrets</h4>
        <div className={descriptionClass}>
         These secrets are encrypted at rest and injected securely at runtime.
         <a rel="noopener noreferrer" target="_blank" className={linkClass} href="https://render.com/docs/configure-environment-variables">
          Learn more.
         </a>
        </div>
       </div>
        <div>
         {!isEditingSecrets && envSecrets.length > 0 && (
          <div className="inline-flex flex-wrap gap-3">
           <button type="button" onClick={handleEditSecrets} className={actionButtonClass}>
            <div className="inline-flex w-4 h-4 me-1.5"><Icon name="editPencil" /></div>
            Edit
           </button>
          </div>
         )}
        </div>
      </div>
      </div>
      
      {loadingConfig ? (
       <div className="py-8 text-center text-gray-500 dark:text-[#8f8f8f] text-[14px]">
        Loading environment secrets…
       </div>
      ) : (
       <div className={bodyClass}>
        <form noValidate onSubmit={(e) => e.preventDefault()}>
         {secretsToShow.length > 0 && (
          <div className={tableWrapperClass}>
           <table className="w-full">
            <thead className="border-b border-solid border-gray-300 dark:border-[#4d4d4d]">
             <tr>
              <th scope="col" className={keyHeaderClass}>Key</th>
              <th scope="col" className={valueHeaderClass}>Value</th>
              <th scope="col" className="w-px pr-4"><span className="sr-only">Delete</span></th>
             </tr>
            </thead>
            <tbody>
             {secretsToShow.map((s, idx) => (
              <tr key={idx}>
               <td className={keyCellClass}>
                <div className="flex flex-col">
                 <label htmlFor={`env-secret-key-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Key</label>
                 <div className="flex relative">
                  <input
                   id={`env-secret-key-${idx}`}
                   placeholder="NAME_OF_SECRET"
                   type="text"
                   value={s.key}
                   readOnly={!isEditingSecrets}
                   onChange={(e) => updateSecret(idx, 'key', e.target.value)}
                   className={keyInputClass}
                  />
                 </div>
                </div>
               </td>
               <td className={valueCellClass}>
                <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
                 <div className="flex flex-col w-full">
                  <label htmlFor={`env-secret-value-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Value</label>
                  <div className="flex relative">
                   {isEditingSecrets ? (
                    <input
                     id={`env-secret-value-${idx}`}
                     type={visibleSecrets[idx] ? 'text' : 'password'}
                     placeholder="value"
                     dir="auto"
                     autoComplete="off"
                     spellCheck={false}
                     value={s.value}
                     onChange={(e) => updateSecret(idx, 'value', e.target.value)}
                     className={valueInputClass}
                    />
                   ) : (
                    <div id={`env-secret-value-${idx}`} className={`${valueInputClass} flex items-center cursor-default select-none`}>
                     {secretIsSet[idx] ? (
                       <span className={visibleSecrets[idx] ? '' : 'tracking-widest'}>
                         {visibleSecrets[idx] ? s.value : '••••••••••'}
                       </span>
                     ) : <span className="text-gray-400 dark:text-[#8f8f8f]">Not set</span>}
                    </div>
                   )}
                  </div>
                 </div>
                 {(isEditingSecrets || secretIsSet[idx]) && (
                  <div className="flex items-center space-x-2 justify-start">
                   <button type="button" aria-label="Toggle secret visibility" onClick={() => toggleSecretVisibility(idx)} className={iconButtonClass}>
                    {visibleSecrets[idx] ? <Icon name="eyeOff" aria-hidden="true" /> : <Icon name="eye" />}
                   </button>
                  </div>
                 )}
                </div>
               </td>
               <td className={deleteCellClass}>
                {isEditingSecrets && (
                 <button onClick={() => removeSecret(idx)} type="button" aria-label="Delete" className={deleteButtonClass}>
                  <Icon name="trash" />
                 </button>
                )}
               </td>
              </tr>
             ))}
            </tbody>
           </table>
          </div>
         )}

         {isEditingSecrets ? (
          <div className={`${secretsToShow.length > 0 ? 'mt-5' : ''} flex flex-col md:flex-row justify-between gap-3`}>
           <div className="flex flex-wrap gap-3">
            <button type="button" onClick={addSecret} className={actionButtonClass}>
             <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>
             Add Secret
            </button>
           </div>
           <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleSaveSecrets} className={actionButtonClass}>
             Save
            </button>
            <button type="button" onClick={handleCancelSecrets} className={actionButtonClass}>
             Cancel
            </button>
           </div>
          </div>
         ) : envSecrets.length === 0 && (
          <div className="flex flex-wrap gap-3">
           <button
            type="button"
            onClick={() => {
             setEditingSecrets([{ key: '', value: '' }]);
             setIsEditingSecrets(true);
            }}
            className={actionButtonClass}
           >
            <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>
            Add Secret
           </button>
          </div>
         )}
        </form>
       </div>
      )}
      </div>

     </main>
   </div>
  );
}
