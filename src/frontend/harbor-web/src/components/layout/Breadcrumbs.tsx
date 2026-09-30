import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useMatch } from 'react-router-dom';
import { getProject, getProjects, type Project } from '../../services/projectService';
import { getService, type Service } from '../../services/serviceService';
import { BiSolidBolt } from 'react-icons/bi';
import { Activity } from 'lucide-react';
import { Icon } from '../icons';

const IconServiceActivity = () => <Activity className="shrink-0 w-4 h-4" />;

const SeparatorIcon = () => <Icon name="chevronRight" className="size-3" />;

const IconEnvironment = ({ environment = 'Production' }: { environment?: string }) =>
  environment.toLowerCase() === 'production' ? (
    <BiSolidBolt className="shrink-0 size-4 breadcrumbs-icon" />
  ) : (
    <Icon name="environmentBurst" className="shrink-0 size-4 breadcrumbs-icon" aria-hidden="true" />
  );

const Crumb = ({ label, to, icon, hasDropdown, dropdownOpen, onDropdownToggle, dropdownItems, isLast }: any) => {
  const content = (
    <div className="flex items-center gap-1.5 py-1.5 px-2 text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer rounded-sm">
      <div className="shrink-0 flex items-center justify-center [&>svg]:w-4 [&>svg]:h-4">
        {icon}
      </div>
      <span className="shrink-0 whitespace-nowrap font-medium text-[14px]">
        {label}
      </span>
    </div>
  );

  return (
    <li className="group/breadcrumb inline-flex items-center shrink-0 relative">
      {to ? <Link to={to} className="flex">{content}</Link> : <span className="flex">{content}</span>}

      {hasDropdown && (
        <div className="inline-flex relative cursor-pointer">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDropdownToggle && onDropdownToggle(); }}
            className="py-2 px-1 flex items-center justify-center cursor-pointer text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded-sm"
          >
            <div className={`transition-transform duration-150 ${dropdownOpen ? 'rotate-90' : ''}`}>
              <SeparatorIcon />
            </div>
          </button>

          {dropdownOpen && dropdownItems && (
            <div className="absolute left-0 top-full mt-1 z-[200]">
              <div
                role="listbox"
                className="py-2 bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-xl border border-gray-200 dark:border-[#525252] rounded-md outline-none overflow-x-hidden min-w-[15rem] max-h-96 overflow-y-auto"
              >
                <ul role="presentation">
                  {dropdownItems.map((item: any, idx: number) => (
                    <li key={idx} role="option" aria-selected={item.selected}>
                      <Link
                        to={item.to}
                        onClick={(e) => { e.stopPropagation(); onDropdownToggle && onDropdownToggle(); }}
                        className={`w-full flex items-center gap-2.5 py-2 px-3 text-[14px] ${item.selected ? 'bg-[#2563eb] text-white font-medium' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727]'}`}
                      >
                        {item.icon && <div className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</div>}
                        <span className="flex-1 text-left truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Separator after non-dropdown crumbs (except last) */}
      {!hasDropdown && !isLast && (
        <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center py-2 px-1 text-gray-400 dark:text-[#8f8f8f]">
          <SeparatorIcon />
        </span>
      )}
    </li>
  );
};


export const Breadcrumbs: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [service, setService] = useState<Service | null>(null);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  const projectMatch = useMatch('/projects/:id/*');
  const projectMatchAlt = useMatch('/project/:id/*');
  const projectId = projectMatch?.params.id || projectMatchAlt?.params.id;
  const isProjectContext = !!projectId;

  const serviceMatch = useMatch('/projects/:projectId/services/:serviceId/*');
  const serviceId = serviceMatch?.params.serviceId;
  // "new" is a frontend route segment, not a real service ID – exclude it
  const isServiceContext = !!serviceId && serviceId !== 'new';

  const isNewServiceRoute = location.pathname.includes('/services/new');

  let currentProjectRouteLabel = 'Environments';
  if (location.pathname.endsWith('/settings')) currentProjectRouteLabel = 'Settings';
  else if (location.pathname.endsWith('/deployments')) currentProjectRouteLabel = 'Deployments';

  // Derive service route label + exact SideNav icon dynamically from URL
  const servicePages: { segment: string; label: string; icon: any }[] = [
    { segment: 'deploys', label: 'Deploys', icon: <Icon name="deploy" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'deployments', label: 'Deploys', icon: <Icon name="deploy" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'ci-history', label: 'CI History', icon: <IconServiceActivity /> },
    { segment: 'events', label: 'Events', icon: <Icon name="events" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'logs', label: 'Logs', icon: <Icon name="logs" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'metrics', label: 'Metrics', icon: <Icon name="metrics" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'environment', label: 'Environment', icon: <Icon name="sliders" className="w-4 h-4" aria-hidden="true" /> },
    { segment: 'settings', label: 'Settings', icon: <Icon name="settingsAlt" className="w-4 h-4" aria-hidden="true" /> },
  ];

  let currentServiceRouteLabel = 'Deploys';
  let currentServiceRouteIcon = <Icon name="deploy" className="w-4 h-4" aria-hidden="true" />;
  if (isServiceContext) {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const serviceSegmentIndex = pathSegments.indexOf('services') + 1;
    const routeSegment = pathSegments[serviceSegmentIndex + 1] || 'deploys';
    const matchedPage = servicePages.find(p => p.segment === routeSegment);
    if (matchedPage) {
      currentServiceRouteLabel = matchedPage.label;
      currentServiceRouteIcon = matchedPage.icon;
    }
  }

  useEffect(() => {
    if (isProjectContext && projectId) {
      getProject(projectId).then(p => setProject(p || null)).catch(() => {});
      getProjects().then(setProjects).catch(() => {});
    } else {
      setProject(null);
      setProjects([]);
    }
  }, [isProjectContext, projectId]);

  useEffect(() => {
    if (isServiceContext && projectId && serviceId) {
      getService(projectId, serviceId).then(s => setService(s || null)).catch(() => {});
    } else {
      setService(null);
    }
  }, [isServiceContext, projectId, serviceId]);

  // Close dropdowns when clicking outside the entire nav
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProjectDropdownOpen(false);
        setIsPageDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const crumbs: any[] = [
    { label: 'Projects', to: '/', icon: <Icon name="projects" className="w-4 h-4" /> }
  ];

  if (location.pathname === '/settings') {
    crumbs.push({ label: 'Account settings', to: '/settings', icon: <Icon name="settings" className="w-4 h-4" /> });
  } else if (isProjectContext) {
    // Project crumb with switcher dropdown
    crumbs.push({
      label: project?.name || 'Loading...',
      to: `/projects/${projectId}/environments`,
      icon: <Icon name="projects" className="w-4 h-4" />,
      hasDropdown: true,
      dropdownOpen: isProjectDropdownOpen,
      onDropdownToggle: () => {
        setIsProjectDropdownOpen(prev => !prev);
        setIsPageDropdownOpen(false);
      },
      dropdownItems: projects.map(p => ({
        label: p.name,
        to: `/projects/${p.publicId || p.id}/environments`,
        selected: p.publicId === projectId || String(p.id) === String(projectId),
        icon: <Icon name="projects" className="w-4 h-4" />
      }))
    });

    if (isServiceContext) {
      // Project > Environment > ServiceName > CurrentPage
      crumbs.push({
        label: 'Production',
        to: `/projects/${projectId}/environments`,
        icon: <IconEnvironment />,
      });
      crumbs.push({
        label: service ? service.name : (serviceId || 'Loading...'),
        to: `/projects/${projectId}/services/${serviceId}/deploys`,
        icon: service?.type === 'web' ? <Icon name="globe" className="shrink-0 size-4" /> : (service?.type === 'static' ? <Icon name="staticSite" className="shrink-0 size-4" /> : <Icon name="deploy" className="w-4 h-4" aria-hidden="true" />),
      });
      // Last crumb: page within service — icon changes dynamically
      crumbs.push({
        label: currentServiceRouteLabel,
        to: location.pathname,
        icon: currentServiceRouteIcon,
        hasDropdown: true,
        dropdownOpen: isPageDropdownOpen,
        onDropdownToggle: () => {
          setIsPageDropdownOpen(prev => !prev);
          setIsProjectDropdownOpen(false);
        },
        dropdownItems: [
          { label: 'Deploys',     to: `/projects/${projectId}/services/${serviceId}/deploys`,     icon: <Icon name="deploy" className="w-4 h-4" aria-hidden="true" />,     selected: currentServiceRouteLabel === 'Deploys' },
          { label: 'CI History',  to: `/projects/${projectId}/services/${serviceId}/ci-history`,  icon: <IconServiceActivity />,   selected: currentServiceRouteLabel === 'CI History' },
          { label: 'Logs',        to: `/projects/${projectId}/services/${serviceId}/logs`,        icon: <Icon name="logs" className="w-4 h-4" aria-hidden="true" />,        selected: currentServiceRouteLabel === 'Logs' },
          { label: 'Metrics',     to: `/projects/${projectId}/services/${serviceId}/metrics`,     icon: <Icon name="metrics" className="w-4 h-4" aria-hidden="true" />,     selected: currentServiceRouteLabel === 'Metrics' },
          { label: 'Environment', to: `/projects/${projectId}/services/${serviceId}/environment`, icon: <Icon name="sliders" className="w-4 h-4" aria-hidden="true" />, selected: currentServiceRouteLabel === 'Environment' },
          { label: 'Settings',    to: `/projects/${projectId}/services/${serviceId}/settings`,    icon: <Icon name="settingsAlt" className="w-4 h-4" aria-hidden="true" />,    selected: currentServiceRouteLabel === 'Settings' },
        ]
      });
    } else if (isNewServiceRoute) {
      crumbs.push({
        label: 'Production',
        to: `/projects/${projectId}/environments`,
        icon: <IconEnvironment />,
      });
      crumbs.push({
        label: 'New Service',
        to: location.pathname,
        icon: <Icon name="webhooks" className="w-4 h-4" />,
      });
    } else {
      // Default project-level page: Project > Page
      crumbs.push({
        label: currentProjectRouteLabel,
        to: location.pathname,
        icon: currentProjectRouteLabel === 'Settings' ? <Icon name="settings" className="w-4 h-4" /> : <Icon name="environments" className="w-4 h-4" />,
        hasDropdown: true,
        dropdownOpen: isPageDropdownOpen,
        onDropdownToggle: () => {
          setIsPageDropdownOpen(prev => !prev);
          setIsProjectDropdownOpen(false);
        },
        dropdownItems: [
          { label: 'Environments', to: `/projects/${projectId}/environments`, icon: <Icon name="environments" className="w-4 h-4" />,   selected: currentProjectRouteLabel === 'Environments' },
          { label: 'Settings',     to: `/projects/${projectId}/settings`,     icon: <Icon name="settings" className="w-4 h-4" />, selected: currentProjectRouteLabel === 'Settings' },
        ]
      });
    }
  }

  return (
    <nav ref={navRef} aria-label="Breadcrumbs" className={`flex-1 min-w-0 overflow-visible [container-type:inline-size] ${isMobile ? 'px-4' : 'h-full flex items-center'}`}>
      <ol className="flex m-0 p-0 w-full min-w-0 overflow-visible text-[16px] leading-[24px] tracking-[0.16px]">
        {crumbs.map((c, idx) => (
          <Crumb key={idx} {...c} isLast={idx === crumbs.length - 1} />
        ))}
      </ol>
    </nav>
  );
};
