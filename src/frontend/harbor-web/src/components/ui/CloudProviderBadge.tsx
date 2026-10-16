import React from 'react';
import { IoLogoVercel } from 'react-icons/io5';
import { SiRender, SiGooglecloud, SiKubernetes, SiRailway } from 'react-icons/si';
import { FaAws, FaDigitalOcean, FaDocker } from 'react-icons/fa';
import { VscAzure } from 'react-icons/vsc';
import { MdOutlineCloud } from 'react-icons/md';

interface CloudProviderBadgeProps {
  provider?: string | null;
  deploymentUrl?: string | null;
  className?: string;
}

interface ProviderMeta {
  name: string;
  badgeClass: string;
  logo: React.ReactNode;
}

export function CloudProviderBadge({ provider, deploymentUrl, className = '' }: CloudProviderBadgeProps) {
  const norm = (provider || '').trim().toLowerCase();
  const url = (deploymentUrl || '').trim().toLowerCase();

  let resolved = 'cloud';
  if (norm === 'vercel' || url.includes('vercel.app')) {
    resolved = 'vercel';
  } else if (norm === 'render' || url.includes('onrender.com')) {
    resolved = 'render';
  } else if (norm === 'railway' || url.includes('railway.app') || url.includes('up.railway.app')) {
    resolved = 'railway';
  } else if (norm === 'aws' || norm.includes('amazon') || url.includes('amazonaws.com') || url.includes('awsapprunner.com') || url.includes('cloudfront.net')) {
    resolved = 'aws';
  } else if (norm === 'gcp' || norm.includes('google') || url.includes('run.app') || url.includes('appspot.com')) {
    resolved = 'gcp';
  } else if (norm === 'azure' || norm.includes('microsoft') || url.includes('azurewebsites.net') || url.includes('azurestaticapps.net')) {
    resolved = 'azure';
  } else if (norm === 'digitalocean' || norm === 'do' || url.includes('ondigitalocean.app')) {
    resolved = 'digitalocean';
  } else if (norm === 'docker') {
    resolved = 'docker';
  } else if (norm === 'kubernetes' || norm === 'k8s') {
    resolved = 'kubernetes';
  } else if (norm) {
    resolved = norm;
  }

  const metaMap: Record<string, ProviderMeta> = {
    vercel: {
      name: 'Vercel',
      badgeClass: 'bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white shadow-sm',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <IoLogoVercel className="w-3.5 h-3.5 text-white dark:text-black" />
        </span>
      ),
    },
    aws: {
      name: 'AWS',
      badgeClass: 'bg-[#232f3e] text-white dark:bg-[#18212d] dark:text-white border border-[#232f3e] dark:border-[#2f3f54]',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <FaAws className="w-4 h-4 text-[#ff9900]" />
        </span>
      ),
    },
    gcp: {
      name: 'Google Cloud',
      badgeClass: 'bg-[#1e293b] text-white dark:bg-[#161f2e] dark:text-white border border-[#334155] dark:border-[#283548]',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <SiGooglecloud className="w-3.5 h-3.5 text-[#4285f4]" />
        </span>
      ),
    },
    azure: {
      name: 'Microsoft Azure',
      badgeClass: 'bg-[#0078d4] text-white dark:bg-[#005a9e] dark:text-white border border-[#0078d4] dark:border-[#0078d4]/60',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <VscAzure className="w-3.5 h-3.5 text-white" />
        </span>
      ),
    },
    render: {
      name: 'Render',
      badgeClass: 'bg-[#14151a] text-white dark:bg-[#181a22] dark:text-white border border-[#262833] dark:border-[#333745]',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <SiRender className="w-3.5 h-3.5 text-white" />
        </span>
      ),
    },
    railway: {
      name: 'Railway',
      badgeClass: 'bg-[#18181b] text-white dark:bg-[#13111C] dark:text-white border border-[#3f3f46] dark:border-[#382D4F]',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <SiRailway className="w-3.5 h-3.5 text-white" />
        </span>
      ),
    },
    digitalocean: {
      name: 'DigitalOcean',
      badgeClass: 'bg-[#0080ff] text-white dark:bg-[#0060df] dark:text-white border border-[#0080ff] dark:border-[#0080ff]/60',
      logo: (
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <FaDigitalOcean className="w-4 h-4 text-white" />
        </span>
      ),
    },
    docker: {
      name: 'Docker',
      badgeClass: 'bg-[#0db7ed] text-white dark:bg-[#0988b0] dark:text-white border border-[#0db7ed] dark:border-[#0db7ed]/60',
      logo: (
        <span className="flex items-center justify-center w-3.5 h-3.5 shrink-0">
          <FaDocker className="w-4 h-4 text-white" />
        </span>
      ),
    },
    kubernetes: {
      name: 'Kubernetes',
      badgeClass: 'bg-[#326ce5] text-white dark:bg-[#2351b8] dark:text-white border border-[#326ce5] dark:border-[#326ce5]/60',
      logo: (
        <span className="flex items-center justify-center w-3.5 h-3.5 shrink-0">
          <SiKubernetes className="w-3.5 h-3.5 text-white" />
        </span>
      ),
    },
    cloud: {
      name: provider?.trim() || 'Cloud',
      badgeClass: 'bg-[#2563eb] text-white dark:bg-[#1d4ed8] dark:text-white border border-[#2563eb] dark:border-[#3b82f6]/50',
      logo: (
        <span className="flex items-center justify-center w-3.5 h-3.5 shrink-0">
          <MdOutlineCloud className="w-4 h-4 text-white" />
        </span>
      ),
    },
  };

  const meta = metaMap[resolved] || metaMap.cloud;

  return (
    <span
      data-testid="cloud-provider-badge"
      className={`inline-flex items-center gap-2 px-3 py-1.5 min-h-[30px] rounded-md text-[13.5px] font-medium leading-none shadow-sm select-none tracking-normal font-[Geist] ${meta.badgeClass} ${className}`}
    >
      {meta.logo}
      <span className="whitespace-nowrap">{meta.name}</span>
    </span>
  );
}
