import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useMatch } from 'react-router-dom';
import { getProject, getProjects, type Project } from '../../services/projectService';
import {
  IconProjects, IconGroups, IconSettings, IconWebhooks,
  IconServiceDeploys, IconServiceEvents, IconServiceLogs,
  IconServiceMetrics, IconServiceSettings, IconServiceEnvironment
} from './SideNav';

const SeparatorIcon = () => (
  <svg fill="currentColor" className="size-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path>
  </svg>
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
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  const projectMatch = useMatch('/projects/:id/*');
  const projectMatchAlt = useMatch('/project/:id/*');
  const projectIdStr = projectMatch?.params.id || projectMatchAlt?.params.id;
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : null;
  const isProjectContext = !!projectId && !isNaN(projectId);

  const serviceMatch = useMatch('/projects/:projectId/services/:serviceId/*');
  const serviceId = serviceMatch?.params.serviceId;
  const isServiceContext = !!serviceId;

  const isNewServiceRoute = location.pathname.includes('/services/new/');

  let currentProjectRouteLabel = 'Environments';
  if (location.pathname.endsWith('/settings')) currentProjectRouteLabel = 'Settings';
  else if (location.pathname.endsWith('/deployments')) currentProjectRouteLabel = 'Deployments';

  // Derive service route label + exact SideNav icon dynamically from URL
  let currentServiceRouteLabel = 'Deploys';
  let currentServiceRouteIcon = <IconServiceDeploys />;
  if (isServiceContext) {
    const lastSegment = location.pathname.split('/').pop();
    if (lastSegment === 'settings') {
      currentServiceRouteLabel = 'Settings';
      currentServiceRouteIcon = <IconServiceSettings />;
    } else if (lastSegment === 'events') {
      currentServiceRouteLabel = 'Events';
      currentServiceRouteIcon = <IconServiceEvents />;
    } else if (lastSegment === 'logs') {
      currentServiceRouteLabel = 'Logs';
      currentServiceRouteIcon = <IconServiceLogs />;
    } else if (lastSegment === 'metrics') {
      currentServiceRouteLabel = 'Metrics';
      currentServiceRouteIcon = <IconServiceMetrics />;
    } else {
      currentServiceRouteLabel = 'Deploys';
      currentServiceRouteIcon = <IconServiceDeploys />;
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
    { label: 'Projects', to: '/', icon: <IconProjects /> }
  ];

  if (location.pathname === '/settings') {
    crumbs.push({ label: 'Account settings', to: '/settings', icon: <IconSettings /> });
  } else if (isProjectContext) {
    // Project crumb with switcher dropdown
    crumbs.push({
      label: project?.name || 'Loading...',
      to: `/projects/${projectId}/environments`,
      icon: <IconProjects />,
      hasDropdown: true,
      dropdownOpen: isProjectDropdownOpen,
      onDropdownToggle: () => {
        setIsProjectDropdownOpen(prev => !prev);
        setIsPageDropdownOpen(false);
      },
      dropdownItems: projects.map(p => ({
        label: p.name,
        to: `/projects/${p.id}/environments`,
        selected: p.id === projectId,
        icon: <IconProjects />
      }))
    });

    if (isServiceContext) {
      // Project > Environment > ServiceName > CurrentPage
      crumbs.push({
        label: 'Production',
        to: `/projects/${projectId}/environments`,
        icon: <IconServiceEnvironment />,
      });
      crumbs.push({
        label: serviceId,
        to: `/projects/${projectId}/services/${serviceId}/deploys`,
        icon: <IconServiceDeploys />,
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
          { label: 'Deploys',  to: `/projects/${projectId}/services/${serviceId}/deploys`,  icon: <IconServiceDeploys />,  selected: currentServiceRouteLabel === 'Deploys' },
          { label: 'Events',   to: `/projects/${projectId}/services/${serviceId}/events`,   icon: <IconServiceEvents />,   selected: currentServiceRouteLabel === 'Events' },
          { label: 'Logs',     to: `/projects/${projectId}/services/${serviceId}/logs`,     icon: <IconServiceLogs />,     selected: currentServiceRouteLabel === 'Logs' },
          { label: 'Metrics',  to: `/projects/${projectId}/services/${serviceId}/metrics`,  icon: <IconServiceMetrics />,  selected: currentServiceRouteLabel === 'Metrics' },
          { label: 'Settings', to: `/projects/${projectId}/services/${serviceId}/settings`, icon: <IconServiceSettings />, selected: currentServiceRouteLabel === 'Settings' },
        ]
      });
    } else if (isNewServiceRoute) {
      crumbs.push({
        label: 'Production',
        to: `/projects/${projectId}/environments`,
        icon: <IconServiceEnvironment />,
      });
      crumbs.push({
        label: 'New Service',
        to: location.pathname,
        icon: <IconWebhooks />,
      });
    } else {
      // Default project-level page: Project > Page
      crumbs.push({
        label: currentProjectRouteLabel,
        to: location.pathname,
        icon: currentProjectRouteLabel === 'Settings' ? <IconSettings /> : <IconGroups />,
        hasDropdown: true,
        dropdownOpen: isPageDropdownOpen,
        onDropdownToggle: () => {
          setIsPageDropdownOpen(prev => !prev);
          setIsProjectDropdownOpen(false);
        },
        dropdownItems: [
          { label: 'Environments', to: `/projects/${projectId}/environments`, icon: <IconGroups />,   selected: currentProjectRouteLabel === 'Environments' },
          { label: 'Settings',     to: `/projects/${projectId}/settings`,     icon: <IconSettings />, selected: currentProjectRouteLabel === 'Settings' },
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
