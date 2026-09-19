import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useMatch } from 'react-router-dom';
import { getProject, getProjects, type Project } from '../../services/projectService';
import { 
  IconProjects, IconBlueprints, IconGroups, 
  IconObservability, IconWebhooks, IconSettings 
} from './SideNav';

// Local icon from DashboardHeader
function IconSettings2() {
  return (
    <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 8.38008C13.5 8.25508 13.5 8.13008 13.5 8.00008C13.5 7.87008 13.5 7.74508 13.5 7.61508L14.46 6.77508C14.637 6.61911 14.7531 6.40559 14.7879 6.17228C14.8226 5.93897 14.7738 5.70088 14.65 5.50008L13.47 3.50008C13.3823 3.34821 13.2562 3.22207 13.1044 3.13431C12.9526 3.04655 12.7804 3.00026 12.605 3.00008C12.4963 2.99925 12.3882 3.01614 12.285 3.05008L11.07 3.46008C10.8602 3.32068 10.6414 3.19541 10.415 3.08508L10.16 1.82508C10.1143 1.59488 9.98905 1.3881 9.80623 1.24093C9.62341 1.09376 9.39466 1.01558 9.16 1.02008H6.82C6.58535 1.01558 6.3566 1.09376 6.17378 1.24093C5.99096 1.3881 5.86573 1.59488 5.82 1.82508L5.565 3.08508C5.33697 3.19538 5.11649 3.32066 4.905 3.46008L3.715 3.03008C3.61065 3.00289 3.50259 2.99276 3.395 3.00008C3.21964 3.00026 3.04741 3.04655 2.89559 3.13431C2.74376 3.22207 2.61769 3.34821 2.53 3.50008L1.35 5.50008C1.2333 5.70058 1.18993 5.93541 1.22733 6.16436C1.26473 6.39332 1.38057 6.60214 1.555 6.75508L2.5 7.62008C2.5 7.74508 2.5 7.87008 2.5 8.00008C2.5 8.13008 2.5 8.25508 2.5 8.38508L1.555 9.22508C1.37564 9.37908 1.25663 9.59165 1.2191 9.82505C1.18158 10.0585 1.22795 10.2976 1.35 10.5001L2.53 12.5001C2.61769 12.6519 2.74376 12.7781 2.89559 12.8659C3.04741 12.9536 3.21964 12.9999 3.395 13.0001C3.50368 13.0009 3.61176 12.984 3.715 12.9501L4.93 12.5401C5.13977 12.6795 5.35859 12.8048 5.585 12.9151L5.84 14.1751C5.88573 14.4053 6.01096 14.6121 6.19378 14.7592C6.3766 14.9064 6.60535 14.9846 6.84 14.9801H9.2C9.43466 14.9846 9.66341 14.9064 9.84623 14.7592C10.029 14.6121 10.1543 14.4053 10.2 14.1751L10.455 12.9151C10.683 12.8048 10.9035 12.6795 11.115 12.5401L12.325 12.9501C12.4282 12.984 12.5363 13.0009 12.645 13.0001C12.8204 12.9999 12.9926 12.9536 13.1444 12.8659C13.2962 12.7781 13.4223 12.6519 13.51 12.5001L14.65 10.5001C14.7667 10.2996 14.8101 10.0648 14.7727 9.8358C14.7353 9.60685 14.6194 9.39802 14.445 9.24508L13.5 8.38008ZM12.605 12.0001L10.89 11.4201C10.4885 11.7601 10.0297 12.026 9.535 12.2051L9.18 14.0001H6.82L6.465 12.2251C5.97422 12.0409 5.51786 11.7755 5.115 11.4401L3.395 12.0001L2.215 10.0001L3.575 8.80008C3.48255 8.28251 3.48255 7.75265 3.575 7.23508L2.215 6.00008L3.395 4.00008L5.11 4.58008C5.51147 4.24003 5.97031 3.97421 6.465 3.79508L6.82 2.00008H9.18L9.535 3.77508C10.0258 3.95929 10.4821 4.22465 10.885 4.56008L12.605 4.00008L13.785 6.00008L12.425 7.20008C12.5175 7.71765 12.5175 8.24751 12.425 8.76508L13.785 10.0001L12.605 12.0001Z"></path><path d="M8 11.0001C7.40666 11.0001 6.82664 10.8241 6.33329 10.4945C5.83995 10.1648 5.45543 9.69631 5.22837 9.14813C5.0013 8.59995 4.94189 7.99675 5.05765 7.41481C5.1734 6.83287 5.45913 6.29832 5.87868 5.87876C6.29824 5.4592 6.83279 5.17348 7.41473 5.05773C7.99668 4.94197 8.59988 5.00138 9.14805 5.22844C9.69623 5.45551 10.1648 5.84002 10.4944 6.33337C10.8241 6.82672 11 7.40674 11 8.00008C11.004 8.39516 10.9292 8.78707 10.7798 9.15286C10.6305 9.51865 10.4096 9.85096 10.1303 10.1303C9.85089 10.4097 9.51857 10.6305 9.15278 10.7799C8.787 10.9292 8.39508 11.0041 8 11.0001ZM8 6.00008C7.73568 5.99392 7.47285 6.04145 7.22741 6.13978C6.98198 6.23811 6.75904 6.3852 6.57208 6.57216C6.38512 6.75912 6.23803 6.98205 6.1397 7.22749C6.04137 7.47292 5.99385 7.73575 6 8.00008C5.99385 8.26441 6.04137 8.52724 6.1397 8.77267C6.23803 9.01811 6.38512 9.24105 6.57208 9.42801C6.75904 9.61496 6.98198 9.76206 7.22741 9.86039C7.47285 9.95872 7.73568 10.0062 8 10.0001C8.26433 10.0062 8.52716 9.95872 8.7726 9.86039C9.01803 9.76206 9.24097 9.61496 9.42793 9.42801C9.61489 9.24105 9.76198 9.01811 9.86031 8.77267C9.95864 8.52724 10.0062 8.26441 10 8.00008C10.0062 7.73575 9.95864 7.47292 9.86031 7.22749C9.76198 6.98205 9.61489 6.75912 9.42793 6.57216C9.24097 6.3852 9.01803 6.23811 8.7726 6.13978C8.52716 6.04145 8.26433 5.99392 8 6.00008Z"></path></svg>
    );
}

export const Breadcrumbs: React.FC<{ isMobile?: boolean }> = ({ isMobile }) => {
  const location = useLocation();

  const desktopProjectDropdownRef = useRef<HTMLLIElement>(null);
  const mobileProjectDropdownRef = useRef<HTMLLIElement>(null);
  const desktopPageDropdownRef = useRef<HTMLLIElement>(null);
  const mobilePageDropdownRef = useRef<HTMLLIElement>(null);

  const projectMatch = useMatch('/projects/:id/*');
  const projectMatchAlt = useMatch('/project/:id/*');
  const projectIdStr = projectMatch?.params.id || projectMatchAlt?.params.id;
  const projectId = projectIdStr ? parseInt(projectIdStr, 10) : null;
  const isProjectContext = !!projectId && !isNaN(projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  useEffect(() => {
    if (isProjectContext && projectId) {
      getProject(projectId).then(p => setProject(p || null)).catch(() => {});
      getProjects().then(setProjects).catch(() => {});
    } else {
      setProject(null);
      setProjects([]);
    }
  }, [isProjectContext, projectId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const isOutsideProject = 
        (!desktopProjectDropdownRef.current || !desktopProjectDropdownRef.current.contains(event.target as Node)) &&
        (!mobileProjectDropdownRef.current || !mobileProjectDropdownRef.current.contains(event.target as Node));
      
      const isOutsidePage = 
        (!desktopPageDropdownRef.current || !desktopPageDropdownRef.current.contains(event.target as Node)) &&
        (!mobilePageDropdownRef.current || !mobilePageDropdownRef.current.contains(event.target as Node));

      if (isOutsideProject) {
        setIsProjectDropdownOpen(false);
      }
      if (isOutsidePage) {
        setIsPageDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsProjectDropdownOpen(false);
        setIsPageDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  let currentProjectRouteLabel = 'Overview';
  if (location.pathname.endsWith('/settings')) currentProjectRouteLabel = 'Settings';
  else if (location.pathname.endsWith('/environments')) currentProjectRouteLabel = 'Environments';
  else if (location.pathname.endsWith('/deployments')) currentProjectRouteLabel = 'Deployments';

  const routeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    '/projects':     { label: 'Projects',     icon: <IconProjects /> },
    '/environments': { label: 'Environments', icon: <IconGroups /> },
    '/deployments':  { label: 'Deployments',  icon: <IconWebhooks /> },
    '/reports':      { label: 'Reports',      icon: <IconObservability /> },
    '/settings':     { label: 'Settings',     icon: <IconSettings /> },
  };

  const currentRoute = routeConfig[location.pathname] || { label: 'Dashboard', icon: <IconBlueprints /> };

  const isNewServiceRoute = location.pathname.includes('/services/new/');
  const serviceTypeMatch = location.pathname.match(/\/services\/new\/(.+)$/);
  const serviceTypeStr = serviceTypeMatch ? serviceTypeMatch[1] : '';
  const serviceTitle = serviceTypeStr === 'static' ? 'Static Site' : 'Web Service';

  if (location.pathname === '/settings') {
    return (
      <nav aria-label="Breadcrumbs" className={`flex-1 min-w-0 overflow-hidden [container-type:inline-size] h-full flex items-center ${isMobile ? 'px-4' : ''}`}>
        <ol className="flex m-0 p-0 w-full min-w-0 overflow-hidden text-[16px] leading-[24px] tracking-[0.16px]">
          <li className="group/breadcrumb inline-flex items-center shrink-0 type-body-01">
            <Link className="flex items-center gap-2 py-1.5 px-2 hover:button-ghost-background--hover active:button-ghost-background--active text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded" to="/">
              <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4 breadcrumbs-icon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
              <span className="shrink-0 whitespace-nowrap [interpolate-size:allow-keywords] transition-[width,max-width] duration-150 ease-out motion-reduce:transition-none sr-only">
                <span className="whitespace-nowrap">Projects</span>
              </span>
            </Link>
            <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center py-2 px-1.5 text-gray-400 dark:text-[#8f8f8f]">
              <svg fill="currentColor" className="size-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg>
            </span>
          </li>
          <li className="group/breadcrumb inline-flex items-center shrink-0 type-body-01">
            <span className="text-[#2563eb] flex items-center gap-2 py-1 ps-3 pe-2" aria-current="page">
              <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4 breadcrumbs-icon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 8.38008C13.5 8.25508 13.5 8.13008 13.5 8.00008C13.5 7.87008 13.5 7.74508 13.5 7.61508L14.46 6.77508C14.637 6.61911 14.7531 6.40559 14.7879 6.17228C14.8226 5.93897 14.7738 5.70088 14.65 5.50008L13.47 3.50008C13.3823 3.34821 13.2562 3.22207 13.1044 3.13431C12.9526 3.04655 12.7804 3.00026 12.605 3.00008C12.4963 2.99925 12.3882 3.01614 12.285 3.05008L11.07 3.46008C10.8602 3.32068 10.6414 3.19541 10.415 3.08508L10.16 1.82508C10.1143 1.59488 9.98905 1.3881 9.80623 1.24093C9.62341 1.09376 9.39466 1.01558 9.16 1.02008H6.82C6.58535 1.01558 6.3566 1.09376 6.17378 1.24093C5.99096 1.3881 5.86573 1.59488 5.82 1.82508L5.565 3.08508C5.33697 3.19538 5.11649 3.32066 4.905 3.46008L3.715 3.03008C3.61065 3.00289 3.50259 2.99276 3.395 3.00008C3.21964 3.00026 3.04741 3.04655 2.89559 3.13431C2.74376 3.22207 2.61769 3.34821 2.53 3.50008L1.35 5.50008C1.2333 5.70058 1.18993 5.93541 1.22733 6.16436C1.26473 6.39332 1.38057 6.60214 1.555 6.75508L2.5 7.62008C2.5 7.74508 2.5 7.87008 2.5 8.00008C2.5 8.13008 2.5 8.25508 2.5 8.38508L1.555 9.22508C1.37564 9.37908 1.25663 9.59165 1.2191 9.82505C1.18158 10.0585 1.22795 10.2976 1.35 10.5001L2.53 12.5001C2.61769 12.6519 2.74376 12.7781 2.89559 12.8659C3.04741 12.9536 3.21964 12.9999 3.395 13.0001C3.50368 13.0009 3.61176 12.984 3.715 12.9501L4.93 12.5401C5.13977 12.6795 5.35859 12.8048 5.585 12.9151L5.84 14.1751C5.88573 14.4053 6.01096 14.6121 6.19378 14.7592C6.3766 14.9064 6.60535 14.9846 6.84 14.9801H9.2C9.43466 14.9846 9.66341 14.9064 9.84623 14.7592C10.029 14.6121 10.1543 14.4053 10.2 14.1751L10.455 12.9151C10.683 12.8048 10.9035 12.6795 11.115 12.5401L12.325 12.9501C12.4282 12.984 12.5363 13.0009 12.645 13.0001C12.8204 12.9999 12.9926 12.9536 13.1444 12.8659C13.2962 12.7781 13.4223 12.6519 13.51 12.5001L14.65 10.5001C14.7667 10.2996 14.8101 10.0648 14.7727 9.8358C14.7353 9.60685 14.6194 9.39802 14.445 9.24508L13.5 8.38008ZM12.605 12.0001L10.89 11.4201C10.4885 11.7601 10.0297 12.026 9.535 12.2051L9.18 14.0001H6.82L6.465 12.2251C5.97422 12.0409 5.51786 11.7755 5.115 11.4401L3.395 12.0001L2.215 10.0001L3.575 8.80008C3.48255 8.28251 3.48255 7.75265 3.575 7.23508L2.215 6.00008L3.395 4.00008L5.11 4.58008C5.51147 4.24003 5.97031 3.97421 6.465 3.79508L6.82 2.00008H9.18L9.535 3.77508C10.0258 3.95929 10.4821 4.22465 10.885 4.56008L12.605 4.00008L13.785 6.00008L12.425 7.20008C12.5175 7.71765 12.5175 8.24751 12.425 8.76508L13.785 10.0001L12.605 12.0001Z"></path><path d="M8 11.0001C7.40666 11.0001 6.82664 10.8241 6.33329 10.4945C5.83995 10.1648 5.45543 9.69631 5.22837 9.14813C5.0013 8.59995 4.94189 7.99675 5.05765 7.41481C5.1734 6.83287 5.45913 6.29832 5.87868 5.87876C6.29824 5.4592 6.83279 5.17348 7.41473 5.05773C7.99668 4.94197 8.59988 5.00138 9.14805 5.22844C9.69623 5.45551 10.1648 5.84002 10.4944 6.33337C10.8241 6.82672 11 7.40674 11 8.00008C11.004 8.39516 10.9292 8.78707 10.7798 9.15286C10.6305 9.51865 10.4096 9.85096 10.1303 10.1303C9.85089 10.4097 9.51857 10.6305 9.15278 10.7799C8.787 10.9292 8.39508 11.0041 8 11.0001ZM8 6.00008C7.73568 5.99392 7.47285 6.04145 7.22741 6.13978C6.98198 6.23811 6.75904 6.3852 6.57208 6.57216C6.38512 6.75912 6.23803 6.98205 6.1397 7.22749C6.04137 7.47292 5.99385 7.73575 6 8.00008C5.99385 8.26441 6.04137 8.52724 6.1397 8.77267C6.23803 9.01811 6.38512 9.24105 6.57208 9.42801C6.75904 9.61496 6.98198 9.76206 7.22741 9.86039C7.47285 9.95872 7.73568 10.0062 8 10.0001C8.26433 10.0062 8.52716 9.95872 8.7726 9.86039C9.01803 9.76206 9.24097 9.61496 9.42793 9.42801C9.61489 9.24105 9.76198 9.01811 9.86031 8.77267C9.95864 8.52724 10.0062 8.26441 10 8.00008C10.0062 7.73575 9.95864 7.47292 9.86031 7.22749C9.76198 6.98205 9.61489 6.75912 9.42793 6.57216C9.24097 6.3852 9.01803 6.23811 8.7726 6.13978C8.52716 6.04145 8.26433 5.99392 8 6.00008Z"></path></svg>
              <span className="shrink-0 whitespace-nowrap [interpolate-size:allow-keywords] transition-[width,max-width] duration-150 ease-out motion-reduce:transition-none">
                <span className="whitespace-nowrap">Account settings</span>
              </span>
            </span>
          </li>
        </ol>
      </nav>
    );
  }

  if (isProjectContext) {
    return (
      <nav aria-label="Breadcrumbs" className={`flex-1 min-w-0 overflow-visible [container-type:inline-size] ${isMobile ? '' : 'h-full flex items-center'}`}>
        <ol className="flex m-0 p-0 w-full min-w-0 overflow-visible items-center h-full text-[16px] leading-[24px] tracking-[0.16px]">
          <li className={`group/breadcrumb inline-flex items-center shrink-0 type-body-01 ${isMobile ? 'pl-4' : ''}`}>
            <Link className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] focus-visible:outline focus:outline-[#2563eb] text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded" to="/projects">
              <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
              <span className="shrink-0 whitespace-nowrap sr-only"><span className="whitespace-nowrap">Projects</span></span>
            </Link>
            <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center py-2 px-1.5 text-gray-400 dark:text-[#8f8f8f]">
              <svg fill="currentColor" className="size-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg>
            </span>
          </li>
          
          <li ref={isMobile ? mobileProjectDropdownRef : desktopProjectDropdownRef} className="group/breadcrumb relative inline-flex items-center shrink-0 type-body-01 cursor-pointer">
            <span className="text-gray-900 dark:text-white flex items-center gap-0 py-1 ps-3 pe-2 focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded">
              <svg fill="currentColor" aria-hidden="true" className="shrink-0 size-4 text-gray-500 dark:text-[#8f8f8f]" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
              <span className="shrink-0 whitespace-nowrap truncate font-medium"><span className="ps-2"><span className="whitespace-nowrap">{project ? project.name : 'Loading...'}</span></span></span>
            </span>
            <div className="inline-flex relative ms-px cursor-pointer group-hover/breadcrumb:bg-gray-100 dark:group-hover/breadcrumb:bg-[#1a1a1a] rounded">
              <button onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)} aria-label="Switch Project" type="button" className={`focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] py-2 px-1.5 flex items-center justify-center cursor-pointer text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded ${isProjectDropdownOpen ? 'bg-gray-100 dark:bg-[#1a1a1a]' : ''}`}><svg fill="currentColor" aria-hidden="true" className={`size-3 transition-transform ${isProjectDropdownOpen ? 'rotate-90' : 'group-hover/breadcrumb:rotate-90'}`} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg></button>
            </div>
            
            {isProjectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 z-50">
                <div role="listbox" className="py-2 bg-white dark:bg-[#141414] shadow-menu border border-gray-300 dark:border-[#525252] outline-none custom-scrollbar overflow-x-hidden overscroll-contain min-w-[15rem] max-h-96 overflow-y-auto max-w-xs">
                  <ul role="presentation">
                    {projects.map((p) => {
                      const isSelected = p.id === projectId;
                      const subRouteMatch = location.pathname.match(/\/projects\/\d+(\/.*)?$/);
                      const currentSubPath = subRouteMatch && subRouteMatch[1] ? subRouteMatch[1] : '/environments';
                      return (
                        <li key={p.id} role="option" aria-selected={isSelected}>
                          <Link 
                            to={`/projects/${p.id}${currentSubPath}`}
                            onClick={() => setIsProjectDropdownOpen(false)}
                            className={`w-full flex relative type-interface-01 py-2 px-3 whitespace-nowrap focus-visible:outline focus:outline-[#2563eb] cursor-pointer ${isSelected ? 'bg-[#2563eb] text-white font-medium' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727]'}`}
                          >
                            <div className="w-full flex items-center space-x-2.5">
                              <svg fill="currentColor" className="w-4 h-4 shrink-0" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
                              <span className="flex-1 text-left truncate">{p.name}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </li>
          
          {isNewServiceRoute ? (
            <>
              <li className="group/breadcrumb inline-flex items-center shrink-0 type-body-01">
                <Link to={`/projects/${projectId}/environments`} className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 dark:hover:bg-[#1a1a1a] focus-visible:outline focus:outline-[#2563eb] text-gray-500 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded">
                  <div className="shrink-0 flex items-center justify-center text-inherit [&>svg]:w-4 [&>svg]:h-4">
                    <svg fill="currentColor" aria-hidden="true" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                  </div>
                  <span className="shrink-0 whitespace-nowrap truncate font-medium"><span className="whitespace-nowrap">Production</span></span>
                </Link>
                <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center py-2 px-1.5 text-gray-400 dark:text-[#8f8f8f]">
                  <svg fill="currentColor" className="size-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg>
                </span>
              </li>
              
              <li className="group/breadcrumb relative inline-flex items-center shrink-0 type-body-01 cursor-pointer">
                <span className="text-gray-900 dark:text-white flex items-center gap-2 py-1 ps-3 pe-2 focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded" aria-current="page">
                  <div className="shrink-0 flex items-center justify-center text-[#2563eb] [&>svg]:w-4 [&>svg]:h-4">
                    <svg fill="currentColor" aria-hidden="true" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M5 15.5127H2C1.73478 15.5127 1.48043 15.4073 1.29289 15.2198C1.10536 15.0323 1 14.7779 1 14.5127V8.5127C1 8.24748 1.10536 7.99312 1.29289 7.80559C1.48043 7.61805 1.73478 7.5127 2 7.5127H5C5.26522 7.5127 5.51957 7.61805 5.70711 7.80559C5.89464 7.99312 6 8.24748 6 8.5127V14.5127C6 14.7779 5.89464 15.0323 5.70711 15.2198C5.51957 15.4073 5.26522 15.5127 5 15.5127ZM2 8.5127V14.5127H5V8.5127H2Z"></path><path d="M14 2.5127H3C2.73478 2.5127 2.48043 2.61805 2.29289 2.80559C2.10536 2.99312 2 3.24748 2 3.5127V6.5127H3V3.5127H14V10.5127H7V11.5127H8V13.5127H7V14.5127H11.5V13.5127H9V11.5127H14C14.2652 11.5127 14.5196 11.4073 14.7071 11.2198C14.8946 11.0323 15 10.7779 15 10.5127V3.5127C15 3.24748 14.8946 2.99312 14.7071 2.80559C14.5196 2.61805 14.2652 2.5127 14 2.5127Z"></path></svg>
                  </div>
                  <span className="shrink-0 whitespace-nowrap font-medium"><span className="whitespace-nowrap">New {serviceTitle}</span></span>
                </span>
                <div className="inline-flex relative ms-px cursor-pointer group-hover/breadcrumb:bg-gray-100 dark:group-hover/breadcrumb:bg-[#1a1a1a] rounded">
                  <button aria-label="Choose a service type" type="button" className="focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] py-2 px-1.5 flex items-center justify-center cursor-pointer text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded"><svg fill="currentColor" aria-hidden="true" className="size-3 transition-transform group-hover/breadcrumb:rotate-90" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg></button>
                </div>
              </li>
            </>
          ) : (
            <li ref={isMobile ? mobilePageDropdownRef : desktopPageDropdownRef} className="group/breadcrumb relative inline-flex items-center shrink-0 type-body-01 cursor-pointer">
              <span className="text-gray-900 dark:text-white flex items-center gap-2 py-1 ps-3 pe-2 focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded" aria-current="page">
                <div className="shrink-0 flex items-center justify-center text-[#2563eb] [&>svg]:w-4 [&>svg]:h-4">
                  {currentRoute.icon}
                </div>
                <span className="shrink-0 whitespace-nowrap font-medium"><span className="whitespace-nowrap">{currentProjectRouteLabel}</span></span>
              </span>
              <div className="inline-flex relative ms-px cursor-pointer group-hover/breadcrumb:bg-gray-100 dark:group-hover/breadcrumb:bg-[#1a1a1a] rounded">
                <button onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)} aria-label="Switch page" type="button" className={`focus-visible:outline focus:outline-[#2563eb] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] py-2 px-1.5 flex items-center justify-center cursor-pointer text-gray-400 dark:text-[#8f8f8f] hover:text-gray-900 dark:hover:text-white transition-colors rounded ${isPageDropdownOpen ? 'bg-gray-100 dark:bg-[#1a1a1a]' : ''}`}><svg fill="currentColor" aria-hidden="true" className={`size-3 transition-transform ${isPageDropdownOpen ? 'rotate-90' : 'group-hover/breadcrumb:rotate-90'}`} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M11 8L5.99999 13L5.29999 12.3L9.59999 8L5.29999 3.7L5.99999 3L11 8Z"></path></svg></button>
              </div>

              {isPageDropdownOpen && (
                <div className="absolute left-0 top-full mt-1 z-50">
                  <div role="listbox" className="py-2 bg-white dark:bg-[#141414] shadow-menu border border-gray-300 dark:border-[#525252] outline-none custom-scrollbar overflow-x-hidden overscroll-contain min-w-[15rem] max-h-96 overflow-y-auto max-w-xs">
                    <ul role="presentation">
                      {[
                        { id: 'environments', name: 'Environments', path: `/projects/${projectId}/environments`,
                          icon: <IconGroups />
                        },
                        { id: 'settings', name: 'Settings', path: `/projects/${projectId}/settings`,
                          icon: <IconSettings2 />
                        }
                      ].map((page) => {
                        const isSelected = location.pathname.startsWith(page.path);
                        return (
                          <li key={page.id} role="option" aria-selected={isSelected}>
                            <Link 
                              to={page.path}
                              onClick={() => setIsPageDropdownOpen(false)}
                              className={`w-full flex relative type-interface-01 py-2 px-3 whitespace-nowrap focus-visible:outline focus:outline-[#2563eb] cursor-pointer ${isSelected ? 'bg-[#2563eb] text-white font-medium' : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#272727]'}`}
                            >
                              <div className="w-full flex items-center space-x-2.5">
                                {page.icon}
                                <span className="flex-1 text-left truncate">{page.name}</span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
            </li>
          )}
        </ol>
      </nav>
    );
  }

  return (
    <nav className={`flex-1 min-w-0 overflow-hidden [container-type:inline-size] ${isMobile ? 'px-4' : 'h-full flex items-center'}`}>
      <ol className="flex m-0 p-0 text-[16px] leading-[24px] tracking-[0.16px]">
        <li className="inline-flex items-center">
          <span className="text-gray-900 dark:text-white flex items-center space-x-2.5 focus:outline-none transition-colors duration-300" aria-current="page">
            <div className="shrink-0 flex items-center justify-center text-current [&>svg]:w-[18px] [&>svg]:h-[18px]">
              {currentRoute.icon}
            </div>
            <span>
              <span className="whitespace-nowrap sm:text-wrap">{currentRoute.label}</span>
            </span>
          </span>
        </li>
      </ol>
    </nav>
  );
};
