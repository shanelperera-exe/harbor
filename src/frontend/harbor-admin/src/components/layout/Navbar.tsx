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
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group focus:outline-none">
          <img src="/logos/harbor_light_notext.svg" alt="Harbor Logo" className="h-7 lg:h-9 w-auto group-hover:opacity-85 transition-opacity" />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span
              className="text-2xl lg:text-[26px] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white transition-colors duration-300"
              style={{ fontFamily: 'Roobert, sans-serif' }}
            >
              Harbor
            </span>
            <span
              className="h-4 sm:h-4.5 w-px bg-gray-300 dark:bg-[#3c4043] transition-colors duration-300"
              aria-hidden="true"
            />
            <span className="text-[13px] sm:text-[14px] lg:text-[15px] font-medium tracking-tight text-gray-500 dark:text-[#9aa0a6] transition-colors duration-300 whitespace-nowrap">
              Admin Portal
            </span>
          </div>
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
