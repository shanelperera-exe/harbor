import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useMatch } from 'react-router-dom';
import { getProject, getProjects, type Project } from '../../services/projectService';
import { getService, type Service } from '../../services/serviceService';
import {
  IconProjects, IconGroups, IconSettings, IconWebhooks,
  IconServiceDeploys, IconServiceEvents, IconServiceLogs,
  IconServiceMetrics, IconServiceSettings
} from './SideNav';

const SeparatorIcon = () => (
  <svg fill="currentColor" className="size-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path>
  </svg>
);

const IconEnvironment = () => (
  <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4 breadcrumbs-icon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
);

const IconWebApp = () => (
  <svg fill="currentColor" className="shrink-0 size-4" width="16" height="16" viewBox="0 0 16 16"><path d="M8 1C6.61553 1 5.26216 1.41054 4.11101 2.17971C2.95987 2.94888 2.06266 4.04213 1.53285 5.32122C1.00303 6.6003 0.86441 8.00776 1.13451 9.36563C1.4046 10.7235 2.07129 11.9708 3.05026 12.9497C4.02922 13.9287 5.2765 14.5954 6.63437 14.8655C7.99224 15.1356 9.3997 14.997 10.6788 14.4672C11.9579 13.9373 13.0511 13.0401 13.8203 11.889C14.5895 10.7378 15 9.38447 15 8C15 6.14348 14.2625 4.36301 12.9497 3.05025C11.637 1.7375 9.85652 1 8 1ZM14 7.5H11C10.9416 5.65854 10.4646 3.85458 9.605 2.225C10.7893 2.54895 11.8457 3.22842 12.6316 4.17171C13.4175 5.115 13.8952 6.27669 14 7.5ZM8 14C7.88846 14.0075 7.77654 14.0075 7.665 14C6.62915 12.3481 6.05426 10.4491 6 8.5H10C9.95026 10.4477 9.38058 12.3466 8.35 14C8.23348 14.0082 8.11653 14.0082 8 14ZM6 7.5C6.04975 5.55234 6.61942 3.65341 7.65 2C7.87264 1.97498 8.09737 1.97498 8.32 2C9.36114 3.6504 9.94124 5.54953 10 7.5H6ZM6.38 2.225C5.52565 3.85582 5.05373 5.65972 5 7.5H2C2.10485 6.27669 2.58247 5.115 3.3684 4.17171C4.15432 3.22842 5.21072 2.54895 6.395 2.225H6.38ZM2.025 8.5H5.025C5.07718 10.3399 5.54739 12.1438 6.4 13.775C5.21943 13.4476 4.16739 12.7666 3.38528 11.8236C2.60317 10.8806 2.12848 9.72076 2.025 8.5ZM9.605 13.775C10.4646 12.1454 10.9416 10.3415 11 8.5H14C13.8952 9.72331 13.4175 10.885 12.6316 11.8283C11.8457 12.7716 10.7893 13.4511 9.605 13.775Z"></path></svg>
);

const IconStaticSite = () => (
  <svg fill="currentColor" className="shrink-0 size-4" width="16" height="17" viewBox="0 0 16 17"><path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path><path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path></svg>
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
        to: `/projects/${p.publicId || p.id}/environments`,
        selected: p.publicId === projectId || String(p.id) === String(projectId),
        icon: <IconProjects />
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
        icon: service?.type === 'web' ? <IconWebApp /> : (service?.type === 'static' ? <IconStaticSite /> : <IconServiceDeploys />),
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
        icon: <IconEnvironment />,
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
