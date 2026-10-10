import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';
import { DeleteConfirmationModal } from '../../components/ui/DeleteConfirmationModal';
import { ChevronDown } from 'lucide-react';
import { FaAws, FaDigitalOcean } from "react-icons/fa";
import { VscAzure } from "react-icons/vsc";
import { SiGooglecloud, SiRender } from "react-icons/si";
import { IoLogoVercel } from "react-icons/io5";

const PROVIDERS = [
  { id: 'AWS', name: 'AWS', icon: FaAws },
  { id: 'Azure', name: 'Microsoft Azure', icon: VscAzure },
  { id: 'Google Cloud', name: 'Google Cloud', icon: SiGooglecloud },
  { id: 'Render', name: 'Render', icon: SiRender },
  { id: 'Vercel', name: 'Vercel', icon: IoLogoVercel },
  { id: 'DigitalOcean', name: 'DigitalOcean', icon: FaDigitalOcean },
];

export default function ServiceSettings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const context = useOutletContext<{ service: any; setService?: (s: any) => void; deployRefreshKey: number }>();
  const service = context?.service;
  const setContextService = context?.setService;

  const [workflowFile, setWorkflowFile] = useState('deploy.yml');
  const [deploymentUrls, setDeploymentUrls] = useState<{environment: string, url: string}[]>([]);
  const [provider, setProvider] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const providerRef = useRef<HTMLDivElement>(null);
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);

  const lastSavedRef = useRef<{ workflowFile: string; deploymentUrls: { environment: string; url: string }[]; provider: string } | null>(null);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setIsProviderDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (service) {
      const initialWf = service.workflowFile || 'deploy.yml';
      const initialUrls = service.deploymentUrls && service.deploymentUrls.length > 0 
        ? service.deploymentUrls 
        : [{ environment: 'Production', url: service.deploymentUrl || '' }];
      const initialProv = service.provider || '';

      setWorkflowFile(initialWf);
      setDeploymentUrls(initialUrls);
      setProvider(initialProv);

      lastSavedRef.current = {
        workflowFile: initialWf,
        deploymentUrls: initialUrls,
        provider: initialProv
      };
    }
  }, [service]);

  const performSave = async () => {
    if (!service) return;
    const token = localStorage.getItem('harbor_token');
    if (!token) return;

    const payloadWf = workflowFile.trim() || 'deploy.yml';
    const cleanUrls = deploymentUrls.filter(u => u.url.trim() !== '');
    const payloadProv = provider.trim();

    setSaveState('saving');
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/projects/${projectId}/services/${service?.publicId || service?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          workflowFile: payloadWf,
          deploymentUrls: cleanUrls,
          provider: payloadProv
        })
      });
      if (!res.ok) {
        throw new Error('Failed to save');
      }
      const json = await res.json();
      const svc = json.data;

      const updatedUrls = svc.deploymentUrls && svc.deploymentUrls.length > 0 
        ? svc.deploymentUrls 
        : [{ environment: 'Production', url: svc.deploymentUrl || '' }];

      lastSavedRef.current = {
        workflowFile: svc.workflowFile || 'deploy.yml',
        deploymentUrls: updatedUrls,
        provider: svc.provider || ''
      };

      if (setContextService) {
        setContextService(svc);
      }
      
      setSaveState('saved');
      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
    } catch (err) {
      console.error('Error saving settings to backend:', err);
      setSaveState('idle');
    }
  };

  function openDeleteModal() {
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
  }

  const serviceDisplayName = (service?.name && !service.name.startsWith('srv-')) ? service.name : 'portfolio';
  const deleteConfirmExpected = 'delete service ' + serviceDisplayName;
  const isDeleteConfirmed = deleteConfirmText === deleteConfirmExpected;

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDeleteConfirmed || deleting) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('harbor_token');
      if (!token) return;
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/projects/${projectId}/services/${service?.publicId || service?.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (!res.ok) {
        throw new Error('Failed to delete service');
      }
      closeDeleteModal();
      navigate(`/projects/${projectId}/environments`, { replace: true });
    } catch (err) {
      console.error('Failed to delete service:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!service) {
    return <div className="p-12 text-center text-red-500">Service not found</div>;
  }

  const filteredProviders = PROVIDERS.filter(p => p.name.toLowerCase().includes(provider.toLowerCase()));
  const selectedProvider = PROVIDERS.find(p => p.name === provider);
  const ProviderIcon = selectedProvider?.icon;

  const isDirty = !!lastSavedRef.current && (
    lastSavedRef.current.workflowFile !== (workflowFile.trim() || 'deploy.yml') ||
    lastSavedRef.current.provider !== provider.trim() ||
    JSON.stringify(lastSavedRef.current.deploymentUrls.filter(u => u.url.trim() !== '')) !== JSON.stringify(deploymentUrls.filter(u => u.url.trim() !== ''))
  );

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <ServiceHeader />

      <main className="px-4 md:px-12 mt-8 mb-20 space-y-8">
      <SectionTitle
        icon={<Icon name="settingsAlt" />}
        title="Settings"
        description="Configure how this service is built, deployed and hosted."
      />

      {/* General Settings Section */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-[#f0f0f0]">General</h3>
        <div className="grid gap-6 p-6 border border-gray-300 dark:border-[#525252] rounded-md bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900 dark:text-[#f0f0f0]">Service Name</label>
            <input 
              type="text" 
              readOnly
              className="h-11 px-3.5 bg-gray-100 dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#525252] rounded-sm text-base text-gray-800 dark:text-[#cccccc] cursor-not-allowed" 
              value={serviceDisplayName}
            />
            <p className="text-sm text-gray-500 dark:text-[#a3a3a3]">The service name cannot be changed after creation</p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900 dark:text-[#f0f0f0]">GitHub Actions Workflow File</label>
            <input 
              type="text" 
              className="h-11 px-3.5 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-base" 
              placeholder="deploy.yml" 
              value={workflowFile} 
              onChange={e => {
                setWorkflowFile(e.target.value);
              }}
            />
            <p className="text-sm text-gray-500 dark:text-[#a3a3a3]">The workflow file in .github/workflows that accepts workflow_dispatch (e.g., deploy.yml)</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-base font-semibold text-gray-900 dark:text-[#f0f0f0]">Deployment URLs</label>
            {deploymentUrls.map((dUrl, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input 
                  type="text" 
                  className="w-1/3 h-11 px-3.5 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-base" 
                  placeholder="Environment (e.g. Production)" 
                  value={dUrl.environment}
                  onChange={e => {
                    const newUrls = [...deploymentUrls];
                    newUrls[idx].environment = e.target.value;
                    setDeploymentUrls(newUrls);
                  }}
                />
                <input 
                  type="text" 
                  className="flex-1 h-11 px-3.5 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-base" 
                  placeholder="URL (e.g. https://api.example.com)" 
                  value={dUrl.url}
                  onChange={e => {
                    const newUrls = [...deploymentUrls];
                    newUrls[idx].url = e.target.value;
                    setDeploymentUrls(newUrls);
                  }}
                />
                <button
                  type="button"
                  className="h-11 px-3.5 text-base text-red-500 hover:text-red-700 transition-colors"
                  onClick={() => {
                    const newUrls = deploymentUrls.filter((_, i) => i !== idx);
                    setDeploymentUrls(newUrls);
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-left text-base font-medium text-[#2563eb] hover:underline mt-1 w-fit"
              onClick={() => {
                const newUrls = [...deploymentUrls, { environment: 'Preview', url: '' }];
                setDeploymentUrls(newUrls);
              }}
            >
              + Add another URL
            </button>
            <p className="text-sm text-gray-500 dark:text-[#a3a3a3]">The URLs where this service will be accessible per environment</p>
          </div>
          <div className="flex flex-col gap-2 relative" ref={providerRef}>
            <label className="text-base font-semibold text-gray-900 dark:text-[#f0f0f0]">Deployment Provider</label>
            <div className="relative">
              {ProviderIcon && !isProviderDropdownOpen && (
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-[#a3a3a3]">
                  <ProviderIcon className="w-5 h-5" />
                </div>
              )}
              <input 
                type="text" 
                className={`w-full h-11 ${ProviderIcon && !isProviderDropdownOpen ? 'pl-11' : 'pl-3.5'} pr-10 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-base`}
                placeholder="Search or select provider..." 
                value={provider}
                onChange={e => {
                  setProvider(e.target.value);
                  setIsProviderDropdownOpen(true);
                }}
                onFocus={() => setIsProviderDropdownOpen(true)}
              />
              <div 
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 cursor-pointer"
                onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
              >
                <ChevronDown className="w-5 h-5" />
              </div>
            </div>
            
            {isProviderDropdownOpen && (
              <div className="absolute top-[78px] left-0 w-full z-10 bg-white dark:bg-[#1f1f1f] border border-gray-300 dark:border-[#525252] rounded-sm shadow-lg max-h-60 overflow-y-auto">
                {filteredProviders.length > 0 ? (
                  <ul className="py-1">
                    {filteredProviders.map(p => (
                      <li 
                        key={p.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] cursor-pointer text-base text-gray-700 dark:text-[#e3e3e3] transition-colors"
                        onClick={() => {
                          setProvider(p.name);
                          setIsProviderDropdownOpen(false);
                        }}
                      >
                        <p.icon className="w-5 h-5 text-gray-500 dark:text-[#a3a3a3]" />
                        <span>{p.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3.5 py-3 text-sm text-gray-500 dark:text-[#8f8f8f]">
                    No matching providers found
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-[#a3a3a3]">The platform hosting this service</p>
          </div>
          <div className="pt-2 min-h-[52px]">
            {(isDirty || saveState !== 'idle') && (
              <button 
                onClick={performSave} 
                disabled={saveState === 'saving'} 
                className="h-11 px-5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-sm text-base transition-all disabled:opacity-50 flex items-center justify-center min-w-[140px]"
              >
                {saveState === 'saving' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : saveState === 'saved' ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="space-y-4">
        <h3 className="text-xl font-semibold text-red-600 dark:text-red-500">Danger Zone</h3>
        <div className="p-6 border border-red-200 dark:border-[#4c1d1d] rounded-md bg-red-50 dark:bg-[#1f0f0f]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-[#f0f0f0]">Delete Service</h4>
              <p className="text-sm text-gray-600 dark:text-[#a3a3a3] mt-1">Once you delete a service, there is no going back. Please be certain.</p>
            </div>
            <button 
              onClick={openDeleteModal}
              className="h-10 px-4 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium rounded-sm transition-colors"
            >
              Delete Service
            </button>
          </div>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
        title="Delete Service"
        warningMessage={
          <p>
            This service <span className="font-semibold">{serviceDisplayName}</span> will be{' '}
            <span className="font-semibold">permanently</span> deleted, along with all of its
            deployments and logs. This action cannot be undone.
          </p>
        }
        expectedConfirmText={deleteConfirmExpected}
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
        isDeleting={deleting}
        deleteButtonLabel="Delete service"
      />
      </main>
    </div>
  );
}