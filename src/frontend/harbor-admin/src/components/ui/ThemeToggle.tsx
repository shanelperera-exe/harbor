import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check initial theme from localStorage or system preference
    const savedTheme = localStorage.getItem('harbor_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('harbor_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('harbor_theme', 'light');
    }
  };

  return (
    <button 
      onClick={toggleTheme}
      aria-label="Toggle theme" 
      className={`fixed right-6 bottom-6 md:right-8 md:bottom-8 z-[100] grid h-[45px] w-[45px] grid-cols-2 overflow-hidden border transition-colors duration-300 ease-out ${
        isDark 
          ? 'border-white bg-gray-900 text-white' 
          : 'border-gray-900 bg-white text-gray-900'
      }`}
    >
      {/* Light Icon (Sun) - Slides in when dark */}
      <div 
        className={`absolute inset-0 flex h-full w-full items-center justify-center transition-transform duration-300 ease-out ${
          isDark ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <svg className="h-[26px] w-[26px]" xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M22.0804 13.4495C21.915 15.2392 21.2433 16.9448 20.144 18.3667C19.0446 19.7886 17.563 20.868 15.8726 21.4785C14.1822 22.0891 12.3528 22.2057 10.5986 21.8145C8.84432 21.4234 7.23775 20.5407 5.96685 19.2698C4.69595 17.9989 3.81328 16.3923 3.42212 14.6381C3.03097 12.8838 3.14751 11.0545 3.7581 9.36404C4.3687 7.67361 5.44809 6.19203 6.86999 5.09267C8.29189 3.99331 9.99747 3.32164 11.7872 3.15625C10.7394 4.57382 10.2351 6.32039 10.3662 8.0783C10.4973 9.8362 11.255 11.4887 12.5015 12.7352C13.748 13.9816 15.4004 14.7393 17.1584 14.8704C18.9163 15.0015 20.6628 14.4973 22.0804 13.4495Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
        </svg>
      </div>

      {/* Dark Icon (Moon/Shape) - Slides in when light */}
      <div 
        className={`absolute inset-0 flex h-full w-full items-center justify-center transition-transform duration-300 ease-out ${
          isDark ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        <svg className="h-[30px] w-[30px]" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" fill="none">
          <g clipPath="url(#clip0_1722_6736)">
            <path d="M15 21.25C18.4518 21.25 21.25 18.4518 21.25 15C21.25 11.5482 18.4518 8.75 15 8.75C11.5482 8.75 8.75 11.5482 8.75 15C8.75 18.4518 11.5482 21.25 15 21.25Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M15 1.25V3.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M15 26.25V28.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M5.27344 5.27344L7.04844 7.04844" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M22.9492 22.9531L24.7242 24.7281" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M1.25 15H3.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M26.25 15H28.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M5.27344 24.7281L7.04844 22.9531" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
            <path d="M22.9492 7.04844L24.7242 5.27344" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
          </g>
          <defs>
            <clipPath id="clip0_1722_6736">
              <rect width="30" height="30" fill="white"></rect>
            </clipPath>
          </defs>
        </svg>
      </div>
    </button>
  );
}
