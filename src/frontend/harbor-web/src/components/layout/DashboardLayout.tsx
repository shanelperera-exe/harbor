import { Outlet, useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import SideNav from './SideNav';

import { useState } from 'react';
import { useEffect } from 'react';
import { clearAuthSession, isTokenExpired } from '../../services/authSession';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

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
    <div className="h-screen flex flex-col w-full bg-white dark:bg-[#090909] text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <DashboardHeader 
        mobileMenuOpen={mobileMenuOpen} 
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
      />
      <div className="flex flex-row flex-grow overflow-hidden relative">
        <SideNav 
          mobileOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
        />
        <main className="flex-grow overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
