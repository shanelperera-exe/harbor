import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import SideNav from './SideNav';

import { useState } from 'react';
import { useEffect } from 'react';
import { clearAuthSession, isTokenExpired } from '../../services/authSession';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Sidebar width state in pixels. Defaults to previous tailwind default (294 desktop, 260 mobile).
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768 ? 294 : 260;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const hideSideNav = location.pathname.includes('/services/new');

  useEffect(() => {
    const checkSession = () => {
      if (isTokenExpired(localStorage.getItem('harbor_token'))) {
        clearAuthSession();
        navigate('/login', { replace: true, state: { reason: 'session-expired' } });
      }
    };

    checkSession();
    const interval = window.setInterval(checkSession, 10000);
    return () => window.clearInterval(interval);
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col w-full bg-white dark:bg-[oklch(0.21_0.03_263.45)] text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <DashboardHeader 
        mobileMenuOpen={mobileMenuOpen} 
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
        sidebarWidth={sidebarWidth}
      />
      <div className="flex flex-row flex-grow overflow-hidden relative">
        {!hideSideNav && (
          <SideNav 
            mobileOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)} 
            sidebarWidth={sidebarWidth}
            setSidebarWidth={setSidebarWidth}
          />
        )}
        <main className="flex-grow overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
