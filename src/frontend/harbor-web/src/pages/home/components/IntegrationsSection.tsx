import { useState } from 'react';
import { motion } from 'motion/react';
import { FaGithub } from 'react-icons/fa';
import { useResolvedTheme } from '../../../contexts/ThemeContext';

type Category = 'All' | 'Cloud Provider' | 'Containers' | 'App Platform' | 'Git & CI/CD';

interface IntegrationItem {
  name: string;
  desc: string;
  tag: Exclude<Category, 'All'>;
  lightIcon?: string;
  darkIcon?: string;
  invertInDark?: boolean;
}

const INTEGRATIONS: IntegrationItem[] = [
  {
    name: 'GitHub & Actions',
    desc: 'Connect repositories, branches, and automated CI/CD workflows in one click.',
    tag: 'Git & CI/CD',
  },
  {
    name: 'Amazon Web Services',
    desc: 'Monitor deployments and stream live runtime logs from AWS workloads.',
    tag: 'Cloud Provider',
    lightIcon: '/external_icons/aws_light.webp',
    darkIcon: '/external_icons/aws_dark.svg',
  },
  {
    name: 'Microsoft Azure',
    desc: 'Unify visibility across Azure Container Apps and cloud environments.',
    tag: 'Cloud Provider',
    lightIcon: '/external_icons/ms_azure.webp',
    darkIcon: '/external_icons/ms_azure.webp',
  },
  {
    name: 'Google Cloud',
    desc: 'Track releases and stream logs from Cloud Run and GKE clusters.',
    tag: 'Cloud Provider',
    lightIcon: '/external_icons/google_cloud.webp',
    darkIcon: '/external_icons/google_cloud.webp',
  },
  {
    name: 'Kubernetes',
    desc: 'Observe pod health, rollouts, and real-time container logs in your browser.',
    tag: 'Containers',
    lightIcon: '/external_icons/kubernetes_light.svg',
    darkIcon: '/external_icons/kubernetes_light.svg',
  },
  {
    name: 'Docker',
    desc: 'Deploy and monitor containerized services with zero configuration drift.',
    tag: 'Containers',
    lightIcon: '/external_icons/docker_light.svg',
    darkIcon: '/external_icons/docker_light.svg',
  },
  {
    name: 'Vercel',
    desc: 'Keep frontend previews and production edge deployments in sync with your backend.',
    tag: 'App Platform',
    lightIcon: '/external_icons/vercel_light.svg',
    darkIcon: '/external_icons/vercel_dark.svg',
  },
  {
    name: 'Render',
    desc: 'Track web services, workers, and automatic deploys from one dashboard.',
    tag: 'App Platform',
    lightIcon: '/external_icons/render.svg',
    darkIcon: '/external_icons/render.svg',
    invertInDark: true,
  },
  {
    name: 'Railway',
    desc: 'Centralize service URLs, logs, and environment configurations effortlessly.',
    tag: 'App Platform',
    lightIcon: '/external_icons/railway_light.svg',
    darkIcon: '/external_icons/railway_dark.svg',
  },
  {
    name: 'DigitalOcean',
    desc: 'Manage App Platform and droplet deployments alongside the rest of your stack.',
    tag: 'Cloud Provider',
    lightIcon: '/external_icons/digitalocean_light.svg',
    darkIcon: '/external_icons/digitalocean_light.svg',
  },
];

const CATEGORIES: Category[] = ['All', 'Cloud Provider', 'Containers', 'App Platform', 'Git & CI/CD'];

function IntegrationLogo({
  item,
  isDark,
  sizeClass = 'w-7 h-7',
}: {
  item: IntegrationItem;
  isDark: boolean;
  sizeClass?: string;
}) {
  if (!item.lightIcon) {
    return <FaGithub className={`${sizeClass} text-gray-900 dark:text-white`} aria-hidden="true" />;
  }

  const src = isDark && item.darkIcon ? item.darkIcon : item.lightIcon;
  const shouldInvert = item.invertInDark && isDark;

  return (
    <img
      src={src}
      alt={item.name}
      className={`${sizeClass} object-contain ${shouldInvert ? 'invert' : ''}`}
      loading="lazy"
    />
  );
}

export default function IntegrationsSection() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  const filtered =
    selectedCategory === 'All'
      ? INTEGRATIONS
      : INTEGRATIONS.filter((item) => item.tag === selectedCategory);

  return (
    <section
      id="integrations"
      className="w-full border-b border-gray-200 dark:border-[#2e3244] bg-[#fafafa] dark:bg-[#0d0f17] py-20 lg:py-28 overflow-hidden"
    >
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[78px] flex flex-col gap-12">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-3 max-w-[680px]">
            <span className="font-mono text-[13px] uppercase tracking-widest text-[#2563eb] dark:text-[#3b82f6] font-medium">
              Seamless Multi-Cloud Integrations
            </span>
            <h2 className="font-['Roobert',sans-serif] font-roobert text-[36px] lg:text-[52px] font-normal tracking-tight leading-[1.08] text-gray-900 dark:text-white">
              Works with the cloud stack you already run.
            </h2>
            <p className="text-[17px] lg:text-[19px] text-gray-600 dark:text-[#a1a1aa] font-light leading-[1.6]">
              Connect GitHub and bring all of your cloud providers, container clusters, and app platforms into one unified Harbor workspace.
            </p>
          </div>

          {/* Interactive Category Filter */}
          <div className="flex flex-wrap gap-1.5 p-1.5 border border-gray-200 dark:border-[#2a2f42] bg-white dark:bg-[#111420] rounded-[2px]">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`relative px-3.5 py-2 font-mono text-[12.5px] rounded-[2px] cursor-pointer transition-colors ${
                    active
                      ? 'text-white font-medium'
                      : 'text-gray-600 dark:text-[#b4bacd] hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="integrations-category-pill"
                      transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                      className="absolute inset-0 bg-[#2563eb] rounded-[2px]"
                    />
                  )}
                  <span className="relative z-10">{cat}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continuous Animated Marquee Ribbon */}
      <div className="mt-12 border-y border-gray-200 dark:border-[#24283a] py-8 overflow-hidden">
        <div className="flex w-max items-center animate-harbor-marquee">
          {[...INTEGRATIONS, ...INTEGRATIONS].map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              className="mx-8 lg:mx-10 flex items-center gap-4 shrink-0"
            >
              <IntegrationLogo item={item} isDark={isDark} sizeClass="w-8 h-8 lg:w-9 lg:h-9" />
              <span className="font-['Roobert',sans-serif] text-[18px] lg:text-[20px] font-medium tracking-tight text-gray-800 dark:text-gray-100 whitespace-nowrap">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Architectural Grid of Integration Adapters */}
      <div className="mx-auto w-full max-w-[1440px] px-5 md:px-10 lg:px-[78px] mt-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 border-t border-l border-gray-200 dark:border-[#272b3d]">
          {filtered.map((item) => (
            <motion.div
              key={item.name}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="group p-6 border-r border-b border-gray-200 dark:border-[#272b3d] bg-white dark:bg-[#111420] hover:bg-gray-50 dark:hover:bg-[#161a2a] transition-colors flex flex-col justify-between gap-6 relative"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="w-12 h-12 border border-gray-200 dark:border-[#2a2f42] bg-[#fafafa] dark:bg-[#0b0d14] rounded-[2px] flex items-center justify-center group-hover:border-[#2563eb] transition-colors p-2">
                  <IntegrationLogo item={item} isDark={isDark} sizeClass="w-7 h-7" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider px-2.5 py-1 bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa] border border-[#2563eb]/20 rounded-[2px]">
                  {item.tag}
                </span>
              </div>

              <div>
                <h3 className="font-['Roobert',sans-serif] text-[20px] font-medium text-gray-900 dark:text-white leading-snug">
                  {item.name}
                </h3>
                <p className="mt-2 text-[14.5px] text-gray-600 dark:text-[#a1a1aa] leading-[1.6] font-light">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
