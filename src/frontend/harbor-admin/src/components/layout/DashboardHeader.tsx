import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import UserAvatar from '../ui/UserAvatar';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { Icon, type IconName } from '../icons';
import { clearAuthSession } from '../../services/authSession';

// ─── Profile dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown({
  username,
  email,
  avatarSvg,
  onClose,
}: {
  username: string;
  email: string;
  avatarSvg: string | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<'main' | 'theme'>('main');
  const { theme, setTheme } = useTheme();

  function handleSignOut() {
    clearAuthSession();
    onClose();
    navigate('/login');
  }

  function handleTheme(t: Theme) {
    setTheme(t);
  }

  const baseItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'hover:bg-gray-100 dark:hover:bg-[#2c2d30] ' +
    'hover:text-gray-900 dark:hover:text-white ' +
    'focus:outline-none transition-colors duration-100';

  const activeItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-blue-600 dark:text-blue-400 ' +
    'bg-blue-50 dark:bg-blue-950/40 ' +
    'hover:bg-blue-100 dark:hover:bg-blue-950/60 ' +
    'hover:text-blue-700 dark:text-blue-300 ' +
    'focus:outline-none transition-colors duration-100';

  const backItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-gray-400 dark:text-[#9aa0a6] ' +
    'hover:bg-gray-100 dark:hover:bg-[#2c2d30] ' +
    'hover:text-gray-900 dark:hover:text-white ' +
    'focus:outline-none transition-colors duration-100';

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'system', label: 'System', icon: <Icon name="monitor" className="w-4 h-4 shrink-0" /> },
    { value: 'light',  label: 'Light',  icon: <Icon name="sun" className="w-4 h-4 shrink-0" /> },
    { value: 'dark',   label: 'Dark',   icon: <Icon name="moon" className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <div
      role="menu"
      tabIndex={0}
      data-testid="profile-dropdown"
      className="outline-none py-1.5 focus:outline-none z-50 text-gray-900 dark:text-white bg-white dark:bg-[#202124]"
    >
      {panel === 'main' && (
        <>
          <div className="flex items-center space-x-3 py-2 px-3.5 border-b border-gray-200 dark:border-[#3c4043]">
            <UserAvatar 
              username={username} 
              svgString={avatarSvg} 
              size={36} 
            />
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[13px] font-medium truncate text-gray-900 dark:text-white">
                {username}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-[#9aa0a6] truncate font-mono">
                {email || 'Admin'}
              </span>
            </div>
          </div>

          <div className="py-1">
            <button
              role="menuitem"
              type="button"
              className={baseItemClass}
              onClick={() => {
                onClose();
                navigate('/settings');
              }}
            >
              <div className="flex items-center space-x-3 w-full">
                <Icon name="settings" className="w-4 h-4 shrink-0" />
                <span className="truncate">Settings</span>
              </div>
            </button>

            <button
              role="menuitem"
              type="button"
              className={baseItemClass}
              onClick={() => setPanel('theme')}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <Icon name="screen" className="w-4 h-4 shrink-0" />
                  <span>Theme</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-400 dark:text-[#9aa0a6] text-[13px]">
                  <span className="capitalize">{theme}</span>
                  <Icon name="chevronRight" className="w-3.5 h-3.5 shrink-0" />
                </div>
              </div>
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-[#3c4043] pt-1">
            <button
              role="menuitem"
              type="button"
              className={`${baseItemClass} text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300`}
              onClick={handleSignOut}
            >
              <div className="flex items-center space-x-3 w-full">
                <Icon name="signOut" className="w-4 h-4 shrink-0" />
                <span className="truncate">Sign out</span>
              </div>
            </button>
          </div>
        </>
      )}

      {panel === 'theme' && (
        <div>
          <button
            type="button"
            className={backItemClass}
            onClick={() => setPanel('main')}
          >
            <div className="flex items-center space-x-2">
              <span className="text-[13px]">&larr;</span>
              <span className="text-[13px] font-medium">Theme</span>
            </div>
          </button>
          <div className="border-t border-gray-200 dark:border-[#3c4043] my-1" />
          {themeOptions.map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={theme === value ? activeItemClass : baseItemClass}
              onClick={() => handleTheme(value)}
            >
              <div className="flex items-center space-x-3 w-full">
                {icon}
                <span className="truncate">{label}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main header component ────────────────────────────────────────────────────

export default function DashboardHeader({
  mobileMenuOpen,
  onToggleMobileMenu,
  sidebarWidth = 260
}: {
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  sidebarWidth?: number;
}) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentUser, setCurrentUser] = useState<{
    username: string;
    email: string;
    avatarSvg: string | null;
  }>({
    username: 'Admin',
    email: '',
    avatarSvg: null
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem('harbor_user');
      if (stored) {
        const u = JSON.parse(stored);
        setCurrentUser({
          username: u.username || 'Admin',
          email: u.email || '',
          avatarSvg: u.avatarSvg || null
        });
      }
    } catch {
      // ignore parsing error
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  // Close on Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dropdownOpen]);

  const routeConfig: Record<string, { label: string; icon: IconName }> = {
    '/dashboard':    { label: 'Control Plane',     icon: 'projects' },
    '/health':       { label: 'System Health',     icon: 'observability' },
    '/users':        { label: 'Users Directory',   icon: 'wrench' },
    '/projects':     { label: 'All Projects',      icon: 'projects' },
    '/domains':      { label: 'Global Domains',    icon: 'globe' },
    '/environments': { label: 'Environments',      icon: 'environments' },
    '/deployments':  { label: 'Deployments',       icon: 'deploy' },
    '/reports':      { label: 'Reports',           icon: 'observability' },
    '/audit':        { label: 'Platform Audit',    icon: 'logs' },
    '/settings':     { label: 'Settings',          icon: 'settings' },
  };

  const currentRoute = routeConfig[location.pathname] || { label: 'Admin Console', icon: 'projects' as IconName };

  return (
    <header
      data-testid="ribbonnav"
      role="banner"
      className="sticky top-0 z-[30] w-full flex h-14 pe-3 sm:pe-4 bg-white dark:bg-[#202124] text-gray-900 dark:text-white border-b border-solid border-gray-300 dark:border-[#3c4043] transition-colors duration-300"
    >
      {/* Logo + workspace */}
      <div 
        className="flex-shrink-0 inline-flex items-center gap-x-4 sm:gap-x-5 px-3 sm:px-4 h-full border-r border-gray-300 dark:border-[#3c4043] bg-white dark:bg-[#202124] transition-colors duration-300"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="inline-flex items-center justify-center h-full sm:border-r border-gray-300 dark:border-[#3c4043] sm:pr-4 gap-x-1 sm:gap-x-0 transition-colors duration-300">
          <button 
            type="button" 
            className="md:hidden flex-shrink-0 flex items-center justify-center w-10 h-10 mr-1 focus:outline-none text-gray-500 dark:text-[#9aa0a6] hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors rounded-sm"
            onClick={onToggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
          <a className="flex-shrink-0 flex items-center justify-center focus:outline-none gap-2" href="/dashboard">
            <img 
              src="/logos/harbor_light_notext.svg" 
              alt="Harbor" 
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain" 
            />
            <span className="hidden sm:inline-block font-medium tracking-tight text-[17px] text-gray-900 dark:text-white">Harbor</span>
            <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
              Admin
            </span>
          </a>
        </div>
      </div>

      {/* Breadcrumb route info */}
      <div className="hidden sm:flex sm:ps-6 border-r border-gray-300 dark:border-[#3c4043] flex-grow h-full items-center transition-colors duration-300">
        <div className="flex-grow flex items-center justify-between">
          <nav>
            <ol className="flex m-0 p-0 items-center space-x-2">
              <li className="inline-flex items-center text-[15px]">
                <span className="text-gray-900 dark:text-white flex items-center space-x-2 focus:outline-none text-[15px] font-medium" aria-current="page">
                  <div className="shrink-0 flex items-center justify-center text-current">
                    <Icon name={currentRoute.icon} className="w-4 h-4" />
                  </div>
                  <span>{currentRoute.label}</span>
                </span>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Profile menu */}
      <div className="flex items-center space-x-3 ml-auto pl-3">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center space-x-2 p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-[#2c2d30] transition-colors focus:outline-none"
            aria-label="User menu"
            data-testid="user-avatar-button"
          >
            <UserAvatar 
              username={currentUser.username} 
              svgString={currentUser.avatarSvg} 
              size={36} 
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#202124] border border-gray-300 dark:border-[#3c4043] rounded-sm shadow-none z-50 overflow-hidden">
              <ProfileDropdown 
                username={currentUser.username}
                email={currentUser.email}
                avatarSvg={currentUser.avatarSvg}
                onClose={() => setDropdownOpen(false)}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
