import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';

import { Breadcrumbs } from './Breadcrumbs';
import UserAvatar from '../ui/UserAvatar';
import { useTheme, type Theme } from '../../contexts/ThemeContext';
import { Icon } from '../icons';
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
  // 'main' | 'theme'
  const [panel, setPanel] = useState<'main' | 'theme'>('main');
  const { theme, setTheme } = useTheme();

  function handleSignOut() {
    localStorage.removeItem('harbor_token');
    localStorage.removeItem('harbor_user');
    onClose();
    navigate('/login');
  }

  function handleTheme(t: Theme) {
    setTheme(t);
  }

  const baseItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'hover:bg-gray-100 dark:hover:bg-[#fafafa] ' +
    'hover:text-gray-900 dark:hover:text-[#272727] ' +
    'focus:outline-none transition-colors duration-100';

  const activeItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-blue-600 dark:text-blue-400 ' +
    'bg-blue-50 dark:bg-blue-950/50 ' +
    'hover:bg-blue-100 dark:hover:bg-blue-950/50 ' +
    'hover:text-blue-700 dark:hover:text-blue-300 ' +
    'focus:outline-none transition-colors duration-100';


  const backItemClass =
    'w-full flex relative text-[14px] py-2 px-3 whitespace-nowrap cursor-pointer ' +
    'text-gray-400 dark:text-[#b3b3b3] ' +
    'hover:bg-gray-100 dark:hover:bg-[#fafafa] ' +
    'hover:text-gray-900 dark:hover:text-[#272727] ' +
    'focus:outline-none transition-colors duration-100';

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'system',
      label: 'System',
      icon: (
        <Icon name="monitor" className="w-4 h-4 shrink-0" />
      ),
    },
    {
      value: 'light',
      label: 'Light',
      icon: (
        <Icon name="sun" className="w-4 h-4 shrink-0" />
      ),
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: (
        <Icon name="moon" className="w-4 h-4 shrink-0" />
      ),
    },
  ];

  return (
    <div
      role="listbox"
      className="absolute right-0 top-full mt-1 z-[9999] w-[18rem] p-4 bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#525252] shadow-none dark:shadow-lg outline-none overflow-hidden rounded-sm"
      style={{ animation: 'dropdownIn 0.1s ease-out' }}
    >
      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.97) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* ── Main panel ── */}
      <div
        className="transition-all duration-100 ease-out"
        style={{
          display: panel === 'main' ? 'block' : 'none',
          opacity: panel === 'main' ? 1 : 0,
          transform: panel === 'main' ? 'translateX(0)' : 'translateX(-8px)',
        }}
      >
        <ul role="presentation">
          {/* User info */}
          <li className="w-full flex items-center mb-2 py-2 px-3">
            <div className="flex w-full gap-3 items-center">
              <div className="flex-shrink-0">
                <UserAvatar svgString={avatarSvg} username={username} size={40} />
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">{username}</span>
                <span className="text-[12px] text-gray-400 dark:text-[#b3b3b3] break-all">{email}</span>
              </div>
            </div>
          </li>

          {/* Account settings */}
          <li role="option">
            <Link
              to="/settings"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={onClose}
            >
              <Icon name="settingsAlt" className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Account settings</span>
            </Link>
          </li>

          {/* Theme — opens sub-panel */}
          <li role="option">
            <button
              type="button"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={() => setPanel('theme')}
            >
              <Icon name="screen" className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Theme</span>
              <Icon name="chevronRight" className="w-4 h-4 shrink-0" />
            </button>
          </li>

          {/* Separator */}
          <li role="separator" className="px-3 py-2">
            <div className="w-full h-px bg-gray-300 dark:bg-[#4d4d4d]" />
          </li>

          {/* Sign out */}
          <li role="option">
            <button
              type="button"
              className={baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
              onClick={handleSignOut}
            >
              <Icon name="signOut" className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Sign out</span>
            </button>
          </li>
        </ul>
      </div>

      {/* ── Theme sub-panel ── */}
      <div
        className="transition-all duration-100 ease-out rounded-sm"
        style={{
          display: panel === 'theme' ? 'block' : 'none',
          opacity: panel === 'theme' ? 1 : 0,
          transform: panel === 'theme' ? 'translateX(0)' : 'translateX(8px)',
        }}
      >
        <ul role="presentation">
          {/* Back */}
          <li>
            <button
              type="button"
              className={backItemClass + ' flex items-center space-x-2.5'}
              onClick={() => setPanel('main')}
            >
              <Icon name="arrowBack" className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">Back</span>
            </button>
          </li>

          {/* Theme options */}
          {themeOptions.map(opt => {
            const isActive = theme === opt.value;
            return (
              <li key={opt.value} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  className={isActive ? activeItemClass + ' flex items-center space-x-2.5' : baseItemClass + ' flex items-center space-x-2.5 text-gray-700 dark:text-[#e3e3e3]'}
                  onClick={() => handleTheme(opt.value)}
                >
                  {opt.icon}
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  {isActive && (
                    <Icon name="check" className="w-4 h-4 shrink-0" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Main component ──

export default function DashboardHeader({
  mobileMenuOpen,
  onToggleMobileMenu,
  sidebarWidth = 260
}: {
  mobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  sidebarWidth?: number;
} = {}) {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  function readUser() {
    try { return JSON.parse(localStorage.getItem('harbor_user') ?? '{}'); }
    catch { return {}; }
  }

  const [storedUser, setStoredUser] = useState(readUser);
  const currentUsername: string  = storedUser.username  ?? '';
  const currentEmail: string     = storedUser.email     ?? '';
  const avatarSvg: string | null = storedUser.avatarSvg ?? null;

  // Re-read whenever localStorage changes (e.g. after navigating back from login)
  useEffect(() => {
    setStoredUser(readUser());
    function onStorage() { setStoredUser(readUser()); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);


  return (
    <>
      <header
        data-testid="ribbonnav"
        role="banner"
        className="shrink-0 sticky top-0 z-[110] w-full flex h-14 pe-3 sm:pe-4 bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white border-b border-solid border-gray-300 dark:border-[#525252] transition-colors duration-300"
      >
      {/* Logo + workspace */}
      <div 
        className="flex-shrink-0 flex items-center px-3 sm:px-4 h-full border-r border-gray-300 dark:border-[#525252] bg-gray-50 dark:bg-[oklch(0.26_0.03_263.45)] transition-colors duration-300"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex-shrink-0 inline-flex items-center justify-center h-full sm:border-r border-gray-300 dark:border-[#525252] sm:pr-4 gap-x-1 sm:gap-x-0 transition-colors duration-300">
          <button 
            type="button" 
            className="md:hidden flex-shrink-0 flex items-center justify-center w-10 h-10 mr-1 focus:outline-none text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded-sm"
            onClick={onToggleMobileMenu}
          >
            {mobileMenuOpen ? (
              <Icon name="closeLight" />
            ) : (
              <Icon name="menu" />
            )}
          </button>
          <a className="flex-shrink-0 flex items-center justify-center focus:outline-none" href="/">
            <img src="/logos/harbor_light_notext.svg" alt="Harbor" className="w-7 h-7 sm:w-8 sm:h-8 object-contain dark:hidden" />
            <img src="/logos/harbor_dark_notext.png" alt="Harbor" className="w-7 h-7 sm:w-8 sm:h-8 object-contain hidden dark:block" />
          </a>
        </div>
        <div className="flex-1 min-w-0 flex items-center pl-4 sm:pl-5 space-x-2">
          <div className="flex relative items-center h-auto min-w-0 w-full">
            <button data-testid="workspace-switcher" type="button" className="h-10 min-w-0 w-full focus:outline-none flex items-center p-1.5 bg-transparent text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#1a1a1a] transition-colors rounded-sm">
              <div className="flex w-full items-center justify-between space-x-2.5 h-10 text-[17px] overflow-hidden">
                <span className="truncate flex-1 text-left font-normal" title={currentUsername ? `${currentUsername}'s workspace` : "My Workspace"}>{currentUsername ? `${currentUsername}'s workspace` : "My Workspace"}</span>
                <Icon name="collapseArrows" className="flex-shrink-0 w-4 h-4" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb + search */}
      <div className="hidden sm:flex sm:ps-6 border-r border-solid border-gray-300 dark:border-[#525252] flex-grow h-full items-center transition-colors duration-300">
        <div className="flex-grow flex items-center justify-between h-full">
          <Breadcrumbs isMobile={false} />
          <div className="me-4">
            <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors h-9 py-1.5 px-3 focus:outline-none items-center hidden sm:flex group/button rounded-sm">
              <div className="inline-flex w-[18px] h-[18px] me-2">
                <Icon name="wrench" aria-hidden="true" />
              </div>
              Search
              <kbd className="inline-flex items-center space-x-1 px-1 py-0.5 h-[22px] w-fit text-[12px] font-mono font-medium leading-none text-gray-500 dark:text-[#a1a1aa] bg-gray-100 dark:bg-[#1a1a1a] border border-gray-300 dark:border-[#525252] ms-2.5 rounded-sm transition-colors duration-300">
                <Icon name="ctrlKeyHint" aria-hidden="true" />
                <span className="sr-only">Ctrl</span>
                <span className="sr-only">+</span>
                <span aria-hidden="true" className="select-none">K</span>
                <span className="sr-only">K</span>
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center sm:ps-4 sm:gap-2.5 gap-1 ml-auto">
        {/* Mobile Search button */}
        <div className="inline-flex sm:hidden relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white transition-colors h-9 w-9 p-0 focus:outline-none flex items-center justify-center rounded-sm">
            <Icon name="wrench" aria-hidden="true" />
          </button>
        </div>

        {/* New button */}
        <div className="hidden sm:inline-flex relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white border border-solid border-gray-300 dark:border-[#525252] transition-colors h-9 py-1.5 px-3 focus:outline-none flex items-center rounded-sm">
            <div className="flex gap-1.5 flex-row items-center">
              <Icon name="plusTall" className="w-[18px] h-[18px]" aria-hidden="true" />
              <span>New</span>
            </div>
          </button>
        </div>

        {/* Help button */}
        <div className="hidden sm:inline-flex relative h-full items-center">
          <button type="button" className="text-[15px] font-medium text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white border border-solid border-gray-300 dark:border-[#525252] transition-colors h-9 py-1.5 px-3 focus:outline-none flex items-center rounded-sm">
            <Icon name="help" aria-label="Help" />
          </button>
        </div>

        {/* Profile avatar + dropdown */}
        <div ref={dropdownRef} className="inline-flex relative h-full items-center">
          <button
            id="profile-menu-trigger"
            type="button"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-label="Open profile menu"
            onClick={() => setDropdownOpen(v => !v)}
            className={
              'text-[15px] font-medium transition-colors h-9 w-9 p-0 focus:outline-none flex items-center justify-center rounded-sm ' +
              (dropdownOpen
                ? 'bg-gray-100 dark:bg-[#1a1a1a] text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-white')
            }
          >
            <span className="max-w-full inline-flex items-center flex-shrink-0 scale-[0.85] sm:scale-100 origin-center transition-transform">
              <UserAvatar svgString={avatarSvg} username={currentUsername} size={36} />
            </span>
          </button>

          {dropdownOpen && (
            <ProfileDropdown
              username={currentUsername}
              email={currentEmail}
              avatarSvg={avatarSvg}
              onClose={() => setDropdownOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
      {/* Mobile Breadcrumb Bar */}
      <div className="shrink-0 sm:hidden flex flex-nowrap items-center h-14 overflow-x-auto border-b border-solid border-gray-300 dark:border-[#525252] bg-white dark:bg-[oklch(0.21_0.03_263.45)]">
        <Breadcrumbs isMobile={true} />
      </div>
    </>
  );
}
