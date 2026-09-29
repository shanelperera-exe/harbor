import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../icons';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button 
      onClick={toggleTheme}
      aria-label="Toggle theme" 
      className={`fixed right-6 bottom-6 md:right-8 md:bottom-8 z-[100] grid h-[45px] w-[45px] grid-cols-2 overflow-hidden border transition-colors duration-300 ease-out rounded-sm ${
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
        <Icon name="sunLarge" className="h-[26px] w-[26px]" />
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
