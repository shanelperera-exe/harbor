import { Outlet } from 'react-router-dom';
import DashboardHeader from './DashboardHeader';
import SideNav from './SideNav';

import { useState } from 'react';

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
