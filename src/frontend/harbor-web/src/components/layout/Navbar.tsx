import { Link } from 'react-router-dom';

const NavLink = ({ children, className = "", to = "#" }: { children: React.ReactNode, className?: string, to?: string }) => (
  <Link to={to} className={`group relative z-[1] inline-flex cursor-pointer transition-colors font-normal text-white px-[6px] py-[12px] lg:py-[23px] xl:px-[20px] ${className}`}>
    <span className="relative">
      <span className="absolute z-[0] origin-right scale-x-0 bg-[#2563eb] transition-transform duration-300 ease-out group-hover:origin-left group-hover:scale-x-100 -top-[4px] -left-[4px] h-[calc(100%+8px)] w-[calc(100%+8px)]"></span>
      <span className="relative z-[1]">{children}</span>
    </span>
  </Link>
);

export default function Navbar() {
  const navLinks = [
    "Home"
  ];

  return (
    <nav className="w-full bg-[#0b0b0b] text-[15px] lg:text-[16px] leading-[112%] text-white pl-4 lg:pl-6 flex items-stretch justify-between border-b border-gray-100 h-[47px] lg:h-[66px]">
      {/* Left side */}
      <div className="flex items-center lg:gap-8">
        {/* Mobile menu button */}
        <button aria-expanded="false" aria-label="Open menu" className="flex items-center justify-center pr-4 py-3 lg:hidden">
          <div className="relative h-[18px] w-[18px] origin-center transition-transform duration-300">
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 bg-white transition-transform duration-300 -translate-y-[calc(50%+5px)]"></div>
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 -translate-y-1/2 bg-white transition-transform duration-300"></div>
            <div className="absolute top-1/2 left-1/2 h-[2px] w-full origin-center -translate-x-1/2 bg-white transition-transform duration-300 -translate-y-[calc(50%-5px)]"></div>
          </div>
        </button>

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img src="/logos/harbor_light_notext.svg" alt="Harbor Logo" className="h-5 lg:h-12 w-auto group-hover:opacity-80 transition-opacity" />
          <span className="text-xl lg:text-2xl font-medium tracking-tight">Harbor™</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center">
          {navLinks.map((link) => (
            <NavLink key={link} to="/">{link}</NavLink>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-stretch">
        <div className="flex items-center pr-4 lg:pr-6">
          <NavLink to="/login">Sign In</NavLink>
        </div>
        <Link to="/register" className="group relative z-[1] cursor-pointer bg-white px-5 lg:px-[30px] flex items-center h-full font-normal transition-colors duration-300 text-black hover:text-white overflow-hidden">
          <div className="pointer-events-none absolute inset-0 z-[0] h-full w-full scale-x-0 bg-[#2563eb] transition-transform duration-300 ease-out origin-right group-hover:origin-left group-hover:scale-x-100"></div>
          <span className="relative z-[1]">Get Started</span>
        </Link>
      </div>
    </nav>
  );
}
