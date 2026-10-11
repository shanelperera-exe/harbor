import { Outlet, useNavigate } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import SideNav from './SideNav';
import { useState, useEffect } from 'react';
import { clearAuthSession, isTokenExpired } from '../../services/authSession';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768 ? 294 : 260;
  });
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const token = localStorage.getItem('harbor_token');
      const user = localStorage.getItem('harbor_user');
      
      if (!token || isTokenExpired(token)) {
        clearAuthSession();
        navigate('/login', { replace: true, state: { reason: 'session-expired' } });
        return;
      }

      if (user) {
        try {
          const parsed = JSON.parse(user);
          if (parsed.role !== 'Admin') {
            clearAuthSession();
            navigate('/login', { replace: true, state: { reason: 'unauthorized' } });
          }
        } catch {
          // ignore parsing error
        }
      }
    };

    checkSession();
    const interval = window.setInterval(checkSession, 10000);
    return () => window.clearInterval(interval);
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col w-full bg-white dark:bg-[#202124] text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <DashboardHeader 
        mobileMenuOpen={mobileMenuOpen} 
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} 
        sidebarWidth={sidebarWidth}
      />
      <div className="flex flex-row flex-grow overflow-hidden relative">
        <SideNav 
          mobileOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)} 
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
        />
        <main className="flex-grow overflow-auto relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
