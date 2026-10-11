import { Link } from 'react-router-dom';



export default function Navbar() {
  const isLoggedIn = !!localStorage.getItem('harbor_token');

  return (
    <nav className="w-full bg-white dark:bg-[#202124] text-[15px] lg:text-[16px] leading-[112%] text-gray-900 dark:text-white pl-4 lg:pl-6 flex items-stretch justify-between border-b border-gray-300 dark:border-[#3c4043] h-[47px] lg:h-[66px] transition-colors duration-300">
      {/* Left side */}
      <div className="flex items-center lg:gap-8">
        {/* Mobile menu button */}
        <button aria-expanded="false" aria-label="Open menu" className="flex items-center justify-center pr-4 py-3 lg:hidden">
          <div className="relative h-[18px] w-[18px] origin-center transition-transform duration-300">
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 bg-gray-900 dark:bg-white transition-transform duration-300 -translate-y-[calc(50%+5px)]"></div>
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 -translate-y-1/2 bg-gray-900 dark:bg-white transition-transform duration-300"></div>
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 bg-gray-900 dark:bg-white transition-transform duration-300 -translate-y-[calc(50%-5px)]"></div>
          </div>
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logos/harbor_light_notext.svg" alt="Harbor Logo" className="h-7 lg:h-10 w-auto group-hover:opacity-80 transition-opacity" />
          <span className="text-2xl lg:text-2xl font-medium tracking-tight text-gray-900 dark:text-white transition-colors duration-300 lowercase" style={{ fontFamily: 'Roobert, sans-serif' }}>harbor</span>
          <span className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded-sm bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
            Admin
          </span>
        </Link>
      </div>

      {/* Right side */}
      <div className="flex items-stretch">
        {isLoggedIn && (
          <Link to="/dashboard" className="group relative z-[1] cursor-pointer bg-gray-900 dark:bg-white px-5 lg:px-[30px] flex items-center h-full font-normal transition-colors duration-300 text-white dark:text-black hover:text-white overflow-hidden">
            <div className="pointer-events-none absolute inset-0 z-[0] h-full w-full scale-x-0 bg-[#2563eb] transition-transform duration-300 ease-out origin-right group-hover:origin-left group-hover:scale-x-100"></div>
            <span className="relative z-[1]">Dashboard</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
