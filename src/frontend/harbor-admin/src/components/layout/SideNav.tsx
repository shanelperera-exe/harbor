import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Activity, 
  Users, 
  FolderGit2, 
  Globe, 
  Rocket, 
  BarChart3, 
  ScrollText, 
  Settings,
  HelpCircle
} from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  isFooter?: boolean;
  isButton?: boolean;
  badge?: string;
}

const NavItem = ({ icon, label, to, isFooter = false, isButton = false, badge }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to));
  const baseClasses = "group/shell-side-nav-item flex items-center justify-between w-full px-2.5 py-1.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 transition-colors duration-150 rounded-sm";
  
  const activeClasses = isActive 
    ? "bg-[#2563eb] text-white text-[14px] font-medium" 
    : "text-gray-700 dark:text-[#bdc1c6] hover:bg-gray-100 dark:hover:bg-[#2c2d30] hover:text-gray-900 dark:hover:text-white text-[14px] font-normal";

  const footerClasses = isFooter 
    ? "text-[13px] text-gray-500 dark:text-[#9aa0a6] hover:text-gray-900 dark:hover:text-white py-1 font-normal" 
    : activeClasses;

  if (isButton) {
    return (
      <li>
        <button type="button" className={`${baseClasses} ${footerClasses}`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex-shrink-0 w-4 h-4 text-current">
              {icon}
            </div>
            <span className="truncate">{label}</span>
          </div>
          {badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-sm bg-gray-200 dark:bg-[#3c4043] text-gray-700 dark:text-gray-300">
              {badge}
            </span>
          )}
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
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex-shrink-0 w-4 h-4 text-current flex items-center justify-center">
            {icon}
          </div>
          <span className="truncate">{label}</span>
        </div>
        {badge && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${isActive ? 'bg-blue-700 text-white' : 'bg-gray-100 dark:bg-[#3c4043] text-gray-600 dark:text-[#bdc1c6]'}`}>
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
};

const NavSection = ({ title, children }: { title?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    {title && (
      <div className="text-gray-400 dark:text-[#9aa0a6] px-2.5 text-[11px] uppercase font-mono tracking-wider mb-1 font-normal">
        {title}
      </div>
    )}
    <ul className="space-y-0.5">{children}</ul>
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
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !setSidebarWidth) return;
      const newWidth = Math.max(200, Math.min(480, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, setSidebarWidth]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 top-14 bg-black/50 z-[40] md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar navigation */}
      <nav 
        className={`
        fixed top-14 left-0 z-[50] flex flex-col justify-between h-[calc(100vh-3.5rem)] 
        bg-white dark:bg-[#202124] border-r border-gray-300 dark:border-[#3c4043] 
        transition-transform duration-300 ease-in-out
        md:relative md:top-0 md:h-full md:translate-x-0 flex-shrink-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div 
          role="separator" 
          tabIndex={0} 
          className="hidden md:block absolute top-0 h-full -right-1 w-2 cursor-col-resize select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 z-10"
          onMouseDown={handleMouseDown}
        ></div>

        <div className="flex-grow overflow-y-auto overflow-x-hidden min-h-48 scrollbar-thin">
          <div className="flex flex-col space-y-4 px-3 py-3">
            <NavSection title="Telemetry">
              <NavItem label="Control Plane" to="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />} />
              <NavItem label="System Health" to="/health" icon={<Activity className="w-4 h-4" />} badge="Live" />
            </NavSection>

            <NavSection title="Tenants & Resources">
              <NavItem label="Users" to="/users" icon={<Users className="w-4 h-4" />} />
              <NavItem label="Projects" to="/projects" icon={<FolderGit2 className="w-4 h-4" />} />
              <NavItem label="Custom Domains" to="/domains" icon={<Globe className="w-4 h-4" />} />
            </NavSection>

            <NavSection title="Operations">
              <NavItem label="Deployments" to="/deployments" icon={<Rocket className="w-4 h-4" />} />
              <NavItem label="Operational Reports" to="/reports" icon={<BarChart3 className="w-4 h-4" />} />
            </NavSection>

            <NavSection title="Governance">
              <NavItem label="Audit Logs" to="/audit" icon={<ScrollText className="w-4 h-4" />} />
              <NavItem label="Platform Settings" to="/settings" icon={<Settings className="w-4 h-4" />} />
            </NavSection>
          </div>
        </div>

        <footer className="flex flex-col px-3 py-3 border-t border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124]">
          <ul className="space-y-0.5">
            <NavItem label="Operator Handbook" to="/settings" icon={<HelpCircle className="w-4 h-4" />} isFooter />
          </ul>
        </footer>
      </nav>
    </>
  );
}
