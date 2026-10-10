import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProjectIntegrations, createProjectIntegration, deleteProjectIntegration, type ProjectIntegration } from '../../services/projectIntegrationService';
import { Icon } from '../../components/icons';
import { RiSaveLine, RiCloseLine } from 'react-icons/ri';
import { BiLinkExternal, BiKey } from 'react-icons/bi';
import { PiPlugBold, PiPlugsConnected } from 'react-icons/pi';
import { IoLogoVercel } from 'react-icons/io5';
import { MdOutlineCloud } from 'react-icons/md';
import { SiRender, SiGooglecloud, SiKubernetes } from 'react-icons/si';
import { FaAws, FaDigitalOcean, FaDocker } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';

const AVAILABLE_PROVIDERS: Array<{
  id: string;
  name: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  lightIcon: string;
  darkIcon: string;
  invertInDark?: boolean;
  desc: string;
}> = [
  { id: 'AWS', name: 'Amazon Web Services', icon: FaAws, iconClass: 'w-11 h-11 translate-y-[2px]', lightIcon: '/external_icons/aws_light.webp', darkIcon: '/external_icons/aws_dark.svg', desc: 'Connect your AWS account for ECS, Lambda, and CloudWatch' },
  { id: 'GCP', name: 'Google Cloud Platform', icon: SiGooglecloud, iconClass: 'w-10 h-10 translate-y-[1px]', lightIcon: '/external_icons/google_cloud.webp', darkIcon: '/external_icons/google_cloud.webp', desc: 'Connect to GCP for Cloud Run and GKE' },
  { id: 'Azure', name: 'Microsoft Azure', icon: VscAzure, iconClass: 'w-9 h-9 translate-y-[1px]', lightIcon: '/external_icons/ms_azure.webp', darkIcon: '/external_icons/ms_azure.webp', desc: 'Connect to Azure App Services and AKS' },
  { id: 'Vercel', name: 'Vercel', icon: IoLogoVercel, iconClass: 'w-8 h-8', lightIcon: '/external_icons/vercel_light.svg', darkIcon: '/external_icons/vercel_dark.svg', desc: 'Connect your Vercel team for Edge networking' },
  { id: 'Render', name: 'Render', icon: SiRender, iconClass: 'w-8 h-8', lightIcon: '/external_icons/render.svg', darkIcon: '/external_icons/render.svg', invertInDark: true, desc: 'Connect to Render for simple hosting' },
  { id: 'DigitalOcean', name: 'DigitalOcean', icon: FaDigitalOcean, iconClass: 'w-9 h-9 translate-y-[1px]', lightIcon: '/external_icons/digitalocean_light.svg', darkIcon: '/external_icons/digitalocean_light.svg', desc: 'Connect your DO account for Droplets and Apps' },
  { id: 'Kubernetes', name: 'Kubernetes', badge: 'Self-Hosted', icon: SiKubernetes, iconClass: 'w-9 h-9 translate-y-[1px]', lightIcon: '/external_icons/kubernetes_light.svg', darkIcon: '/external_icons/kubernetes_light.svg', desc: 'Bring your own K8s cluster' },
  { id: 'Docker', name: 'Docker', badge: 'Self-Hosted', icon: FaDocker, iconClass: 'w-11 h-11 translate-y-[1px]', lightIcon: '/external_icons/docker_light.svg', darkIcon: '/external_icons/docker_light.svg', desc: 'Connect to your own Docker Daemon or Swarm' },
];

const ProviderLogo = ({ provider, className = "w-12 h-12" }: { provider: typeof AVAILABLE_PROVIDERS[0], className?: string }) => {
  if (provider.lightIcon === provider.darkIcon) {
    return <img src={provider.lightIcon} alt={provider.name} className={`${className} object-contain ${provider.invertInDark ? 'dark:invert' : ''}`} />;
  }
  return (
    <>
      <img src={provider.lightIcon} alt={provider.name} className={`${className} object-contain dark:hidden block`} />
      <img src={provider.darkIcon} alt={provider.name} className={`${className} object-contain hidden dark:block`} />
    </>
  );
};

export default function ProjectIntegrations() {
  const { id } = useParams<{ id: string }>();
  // State
  const [activeIntegrations, setActiveIntegrations] = useState<ProjectIntegration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<typeof AVAILABLE_PROVIDERS[0] | null>(null);
  const [hoveredProvider, setHoveredProvider] = useState<typeof AVAILABLE_PROVIDERS[0] | null>(null);
  const [integrationName, setIntegrationName] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      getProjectIntegrations(id).then(setActiveIntegrations).catch(console.error);
    }
  }, [id]);

  const openModal = (provider: typeof AVAILABLE_PROVIDERS[0]) => {
    setSelectedProvider(provider);
    setIntegrationName(`${provider.name} Connection`);
    setApiToken('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedProvider(null);
  };

  const handleSave = async () => {
    if (!selectedProvider || !integrationName || !apiToken || !id) return;
    setIsSubmitting(true);
    
    try {
      const created = await createProjectIntegration(id, {
        providerType: selectedProvider.id,
        name: integrationName,
        providerToken: apiToken
      });
      setActiveIntegrations(prev => [created, ...prev]);
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Failed to create integration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteIntegration = async (integrationId: number) => {
    if (!id || !confirm("Are you sure you want to delete this integration?")) return;
    try {
      await deleteProjectIntegration(id, integrationId);
      setActiveIntegrations(prev => prev.filter(i => i.id !== integrationId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete integration.');
    }
  };

  const TitleIcon = hoveredProvider ? hoveredProvider.icon : MdOutlineCloud;
  const titleIconClass = hoveredProvider?.iconClass || 'w-10 h-10 translate-y-[2px]';

  return (
    <div className="w-full lg:max-w-[calc(100vw-294px)]">
      <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
        <div className="my-6 md:my-12 flex flex-col gap-2">
          <h1 className="text-[36px] font-[500] leading-[40px] tracking-[-0.32px] text-gray-900 dark:text-white flex items-center gap-2.5 flex-wrap" style={{ fontFamily: 'Roobert, sans-serif' }}>
            <span>Integrate {hoveredProvider ? '' : 'a '}</span>
            <span className={`text-gray-500 dark:text-gray-400 inline-flex items-center gap-2.5 ${!hoveredProvider ? 'underline decoration-gray-400 dark:decoration-gray-500 decoration-dashed underline-offset-4' : ''}`}>
              <span>{hoveredProvider ? hoveredProvider.name : 'cloud provider'}</span>
              <TitleIcon className={`${titleIconClass} shrink-0 text-current transition-all`} />
            </span>
          </h1>
          <p className="text-gray-500 dark:text-[#a1a1aa] text-[16px] font-normal">
            Connect your cloud providers to deploy services and sync logs centrally.
          </p>
        </div>

        {/* Active Integrations */}
        {activeIntegrations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[22px] font-medium text-gray-900 dark:text-white mb-6">Active Connections</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {activeIntegrations.map((integration) => {
                const providerDef = AVAILABLE_PROVIDERS.find(p => p.id === integration.providerType);
                
                return (
                  <div key={integration.id} className="p-6 page-primary border border-solid border-gray-300 dark:border-[#525252] rounded-sm relative group hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                    <button 
                      onClick={() => deleteIntegration(integration.id)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Icon name="trash" />
                    </button>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center justify-center p-3 bg-gray-100 dark:bg-[#272727] rounded-md">
                        {providerDef ? <ProviderLogo provider={providerDef} className="w-12 h-12" /> : <BiLinkExternal className="w-12 h-12 text-gray-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[17px] font-medium text-gray-900 dark:text-white truncate">{integration.name}</h3>
                        <p className="text-[14.5px] text-gray-500 dark:text-[#a1a1aa] font-normal">{providerDef?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11.5px] font-medium rounded-sm bg-emerald-50 dark:bg-[#1a3826] text-emerald-700 dark:text-[#4ade80] border border-emerald-200 dark:border-[#22543d]">
                        <PiPlugsConnected className="w-3.5 h-3.5" />
                        <span>Connected</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11.5px] font-medium rounded-sm bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-[#b0b0b0] border border-gray-200 dark:border-[#404040]">
                        <Icon name="lock" className="w-3 h-3" />
                        <span>Encrypted</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Providers Grid */}
        <h2 className="text-[22px] font-medium text-gray-900 dark:text-white mb-6">Available Providers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AVAILABLE_PROVIDERS.map((provider) => {
            return (
              <div 
                key={provider.id} 
                className="p-6 page-primary border border-solid border-gray-300 dark:border-[#525252] rounded-sm cursor-pointer hover:border-blue-500 transition-all group"
                onClick={() => openModal(provider)}
                onMouseEnter={() => setHoveredProvider(provider)}
                onMouseLeave={() => setHoveredProvider(null)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center justify-center p-3 bg-gray-50 dark:bg-white/[0.03] rounded-md group-hover:bg-gray-100 dark:group-hover:bg-[#272727] transition-colors">
                    <ProviderLogo provider={provider} className="w-12 h-12" />
                  </div>
                  <button className="flex items-center gap-2 text-[14.5px] font-mono text-[#2563eb] dark:text-[#3b82f6] hover:text-[#1d4ed8] dark:hover:text-[#60a5fa] opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Connect</span>
                    <PiPlugBold className="w-[18px] h-[18px]" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="text-[18px] font-medium leading-snug text-gray-900 dark:text-[#f0f0f0]">{provider.name}</h3>
                  {provider.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-[#b0b0b0] border border-gray-200 dark:border-[#404040]">
                      {provider.badge}
                    </span>
                  )}
                </div>
                <p className="text-[13.5px] text-gray-500 dark:text-[#a1a1aa] leading-snug font-normal">
                  {provider.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Connection Modal */}
        {isModalOpen && selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] rounded-lg w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-[#333]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <ProviderLogo provider={selectedProvider} className="w-8 h-8" />
                    <h3 className="text-[20px] font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <span>Connect {selectedProvider.name}</span>
                      {selectedProvider.badge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded-sm bg-gray-100 dark:bg-[#2a2a2a] text-gray-600 dark:text-[#b0b0b0] border border-gray-200 dark:border-[#404040]">
                          {selectedProvider.badge}
                        </span>
                      )}
                    </h3>
                  </div>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                    <RiCloseLine className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[14.5px] font-normal text-gray-700 dark:text-gray-300 mb-1.5">Connection Name</label>
                  <input 
                    type="text" 
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 dark:bg-[#272727] border border-gray-300 dark:border-[#525252] rounded-md text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-normal text-[15px]"
                    placeholder="e.g. Production Cluster"
                  />
                </div>
                <div>
                  <label className="block text-[14.5px] font-normal text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                    <BiKey className="text-gray-400" /> API Token / Access Key
                  </label>
                  <input 
                    type="password" 
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    className="w-full h-10 px-3 bg-gray-50 dark:bg-[#272727] border border-gray-300 dark:border-[#525252] rounded-md text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono font-normal text-[14px]"
                    placeholder={`Enter your ${selectedProvider.id} credentials...`}
                  />
                  <p className="mt-2 text-[13px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-normal">
                    <Icon name="lock" /> This credential will be secured using AES-256 Envelope Encryption.
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1f1f1f] flex justify-end gap-3">
                <button 
                  onClick={closeModal}
                  className="px-4 py-2 text-[14.5px] font-normal text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={!integrationName || !apiToken || isSubmitting}
                  className="px-4 py-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[14.5px] font-normal rounded-md disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><RiSaveLine className="w-4 h-4" /> Save Connection</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
