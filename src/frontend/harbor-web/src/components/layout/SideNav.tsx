import { useState, useEffect } from 'react';
import { Link, useLocation, useMatch } from 'react-router-dom';
import { getProject, type Project } from '../../services/projectService';
import { getService, type Service } from '../../services/serviceService';
import { Activity, LayoutDashboard } from 'lucide-react';
import { SlSupport } from 'react-icons/sl';

const NavItem = ({ icon, label, to, isFooter = false, isButton = false }: any) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const baseClasses = "group/shell-side-nav-item flex items-center w-full px-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 space-x-3 py-2 transition-colors duration-200 rounded-sm";
  
  const activeClasses = isActive 
    ? "bg-[#2563eb] text-white text-[17px] font-medium" 
    : "hover:bg-gray-100 dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-[#f0f0f0] text-gray-600 dark:text-[#c7c7c7] text-[17px] font-medium";

  const footerClasses = isFooter 
    ? "text-[16px] text-gray-500 dark:text-[#c7c7c7] hover:text-gray-900 dark:hover:text-[#f0f0f0] space-x-2 py-1.5 font-medium" 
    : activeClasses;

  if (isButton) {
    return (
      <li>
        <button type="button" className={`${baseClasses} ${footerClasses}`}>
          <div className="flex-shrink-0 w-4 h-4 text-current">
            {icon}
          </div>
          <span className="truncate">{label}</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <Link 
        to={to}
        className={`${baseClasses} ${footerClasses}`}
        aria-current={isActive ? "page" : undefined}
      >
        <div className="flex-shrink-0 w-5 h-5 text-current flex items-center justify-center">
          {icon}
        </div>
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
};

const NavSection = ({ title, children }: any) => (
  <div className="space-y-2">
    {title && <div className="text-gray-400 dark:text-[#b3b3b3] px-2 text-[14px] uppercase font-mono tracking-wider">{title}</div>}
    <ul>{children}</ul>
  </div>
);

export default function SideNav({ 
  mobileOpen = false, 
  onClose,
  sidebarWidth = 260,
  setSidebarWidth
}: { 
  mobileOpen?: boolean; 
  onClose?: () => void;
  sidebarWidth?: number;
  setSidebarWidth?: (width: number) => void;
} = {}) {
  const projectMatch = useMatch('/projects/:id/*');
  const projectIdStr = projectMatch?.params?.id;
  const projectId = projectIdStr || null;
  
  const serviceMatch = useMatch('/projects/:projectId/services/:serviceId/*');
  const serviceId = serviceMatch?.params?.serviceId;
  // "new" is a frontend route segment, not a real service ID – exclude it
  const isServiceContext = !!serviceId && serviceId !== 'new';
  
  const isProjectContext = !!projectId && !isServiceContext;

  const [project, setProject] = useState<Project | null>(null);
  const [service, setService] = useState<Service | null>(null);

  useEffect(() => {
    if (projectId) {
      getProject(projectId as any).then(p => setProject(p || null)).catch(() => {});
    } else {
      setProject(null);
    }
  }, [isProjectContext, projectId]);

  useEffect(() => {
    if (isServiceContext && projectId && serviceId) {
      getService(projectId, serviceId).then(s => setService(s || null)).catch(() => {});
    } else {
      setService(null);
    }
  }, [isServiceContext, projectId, serviceId]);

  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !setSidebarWidth) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      } else if (newWidth < 200) {
        setSidebarWidth(200);
      } else if (newWidth > 600) {
        setSidebarWidth(600);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const location = useLocation();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 top-14 bg-black/60 z-[40] md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar navigation */}
      <nav 
        className={`
        fixed top-14 left-0 z-[50] flex flex-col justify-between h-[calc(100vh-3.5rem)] 
        bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)] border-r border-gray-300 dark:border-[#525252] 
        transition-transform duration-300 ease-in-out rounded-sm
        md:relative md:top-0 md:h-full md:translate-x-0 flex-shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div 
          role="separator" 
          tabIndex={0} 
          className="hidden md:block absolute top-0 h-full -right-1 w-2 cursor-col-resize select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 z-10"
          onMouseDown={handleMouseDown}
        ></div>

        <div className="flex-grow overflow-y-auto overflow-x-hidden min-h-48 scrollbar-thin">
          {isServiceContext ? (
            <div className="flex flex-col space-y-2 mt-4 px-3 py-1">
              <Link 
                to={`/projects/${serviceMatch.params.projectId}/environments`}
                className="flex items-center space-x-2 py-1 text-[13px] text-gray-500 hover:text-gray-900 dark:text-[#a1a1aa] dark:hover:text-white transition-colors outline-none focus:outline-none"
              >
                <Icon name="arrowLeft" className="flex-shrink-0 ml-1 w-3 h-3" aria-hidden="true" />
                <span>Environment</span>
              </Link>
              
              <div className="flex items-center space-x-2 text-black dark:text-white px-1 py-3">
                <Icon name="globe" className="flex-shrink-0 w-5 h-5 text-gray-700 dark:text-[#f0f0f0]" aria-hidden="true" />
                <span className="font-medium truncate">{service ? service.name : (serviceId || 'Loading...')}</span>
              </div>
              
              <div className="flex flex-col space-y-6 py-2">
                <ul>
                  <NavItem label="Deployments" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/deploys`} icon={<Icon name="deploy" className="w-4 h-4" aria-hidden="true" />} />
                  <NavItem label="CI History" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/ci-history`} icon={<Activity className="w-4 h-4" />} />
                  <NavItem label="Settings" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/settings`} icon={<Icon name="settingsAlt" className="w-4 h-4" aria-hidden="true" />} />
                </ul>
                
                <div className="relative space-y-2">
                  <div className="text-[#b3b3b3] px-2.5 text-[15px] uppercase font-mono tracking-wider">Monitor</div>
                  <ul>
                    <NavItem label="Logs" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/logs`} icon={<Icon name="logs" className="w-4 h-4" aria-hidden="true" />} />
                    <NavItem label="Metrics" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/metrics`} icon={<Icon name="metrics" className="w-4 h-4" aria-hidden="true" />} />
                  </ul>
                </div>

                <div className="relative space-y-2">
                  <div className="text-[#b3b3b3] px-2.5 text-[15px] uppercase font-mono tracking-wider">Manage</div>
                  <ul>
                    <NavItem label="Environment" to={`/projects/${serviceMatch.params.projectId}/services/${serviceId}/environment`} icon={<Icon name="sliders" className="w-4 h-4" aria-hidden="true" />} />
                  </ul>
                </div>
              </div>
            </div>
          ) : isProjectContext ? (
            <div className="flex flex-col space-y-2 mt-4 px-3 py-1">
              <Link 
                to="/projects"
                className="flex items-center space-x-2 py-1 text-[13px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors outline-none focus:outline-none"
              >
                <Icon name="arrowLeft" className="flex-shrink-0 ml-1 w-3 h-3" aria-hidden="true" />
                <span>Projects</span>
              </Link>
              
              <div className="flex items-center space-x-2 text-black dark:text-[#f0f0f0] px-1 py-3">
                <Icon name="projects" className="flex-shrink-0 w-5 h-5 text-black dark:text-[#f0f0f0]" aria-hidden="true" />
                <span className="font-medium truncate">{project ? project.name : 'Loading...'}</span>
              </div>
              
              <div className="flex flex-col space-y-6 py-2">
                <ul>
                  <li>
                    <Link 
                      to={`/projects/${projectId}/environments`}
                      className={`group/shell-side-nav-item flex items-center w-full px-2 text-left space-x-3 py-2 transition-colors duration-200 rounded-sm ${
                        location.pathname === `/projects/${projectId}/environments` || location.pathname === `/projects/${projectId}`
                        ? 'bg-[#2563eb] text-white text-[17px] font-medium' 
                        : 'hover:bg-gray-100 dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-[#f0f0f0] text-gray-600 dark:text-[#c7c7c7] text-[17px] font-medium'
                      }`}
                    >
                      <div className="flex-shrink-0 w-5 h-5 text-current flex items-center justify-center">
                        <Icon name="database" className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <span className="truncate">Overview</span>
                    </Link>
                  </li>
                </ul>
                
                <div className="relative space-y-2">
                  <div className="text-[#b3b3b3] px-2.5 text-[12px] uppercase font-mono tracking-wider">Manage</div>
                  <ul>
                    <li>
                      <Link 
                        to={`/projects/${projectId}/settings`}
                        className={`group/shell-side-nav-item flex items-center w-full px-2 text-left space-x-3 py-2 transition-colors duration-200 rounded-sm ${
                          location.pathname === `/projects/${projectId}/settings`
                          ? 'bg-[#2563eb] text-white text-[17px] font-medium' 
                          : 'hover:bg-gray-100 dark:hover:bg-[#272727] hover:text-gray-900 dark:hover:text-[#f0f0f0] text-gray-600 dark:text-[#c7c7c7] text-[17px] font-medium'
                        }`}
                      >
                        <div className="flex-shrink-0 w-5 h-5 text-current flex items-center justify-center">
                          <Icon name="settings" className="w-4 h-4" />
                        </div>
                        <span className="truncate">Settings</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-6 px-3 py-4">
              <NavSection title="Workspace">
                <NavItem label="Dashboard" to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} />
                <NavItem label="Projects" to="/projects" icon={<Icon name="projects" className="w-4 h-4" />} />
              </NavSection>

              <NavSection title="Infrastructure">
                <NavItem label="Environments" to="/environments" icon={<Icon name="environments" className="w-4 h-4" />} />
                <NavItem label="Deployments" to="/deployments" icon={<Icon name="deploy" className="w-4 h-4" aria-hidden="true" />} />
              </NavSection>

              <NavSection title="Observability">
                <NavItem label="Reports" to="/reports" icon={<Icon name="observability" className="w-4 h-4" />} />
              </NavSection>

              <NavSection title="System">
                <NavItem label="Settings" to="/settings" icon={<Icon name="settings" className="w-4 h-4" />} />
              </NavSection>
            </div>
          )}
          
          <div aria-hidden="true" className="pointer-events-none sticky bottom-0 left-0 w-full h-4 bg-gradient-to-t from-gray-50 dark:from-[oklch(0.26_0.03_263.45)] to-transparent transition-colors duration-300"></div>
        </div>

      <footer className="flex flex-col space-y-4 px-3 py-4 border-t border-gray-300 dark:border-[#525252] transition-colors duration-300">
        <div className="relative">
          <ul className="mb-4 pr-8">
            <NavItem label="Contact support" isButton isFooter icon={<SlSupport className="w-4 h-4" />} />
          </ul>
        </div>
      </footer>
    </nav>
    </>
  );
}

import { Icon } from '../icons';


