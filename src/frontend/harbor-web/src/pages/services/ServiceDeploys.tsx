import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Copy, Globe, XCircle } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';

export default function ServiceDeploys() {
  const { serviceId } = useParams();
  const [isManualDeployOpen, setIsManualDeployOpen] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      {/* Header Area */}
      <div className="py-8 border-b border-gray-300 dark:border-[#525252]">
        <header className="px-4 md:px-12 space-y-4">
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider font-mono">
            <Globe className="w-4 h-4" />
            <span>Web Service</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-y-4">
            <div className="flex-1 min-w-0">
              <h1 className="flex flex-wrap items-center gap-4 text-3xl font-medium text-gray-900 dark:text-white pr-4">
                <div className="min-w-0 break-words">{serviceId}</div>
                <div className="flex flex-wrap gap-2.5">
                  <span className="inline-flex items-center px-2 py-1 text-sm font-medium border border-gray-300 dark:border-transparent bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-white rounded-sm">
                    Docker
                  </span>
                  <span className="inline-flex items-center px-2 py-1 text-sm font-medium bg-[#48008c] text-[#f4f0ff] rounded-sm">
                    Free
                  </span>
                </div>
              </h1>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0 text-base">
              <button className="h-10 px-4 flex items-center justify-center gap-2 border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white font-medium transition-colors rounded-sm">
                Connect
              </button>
              <div className="relative">
                <button 
                  onClick={() => setIsManualDeployOpen(!isManualDeployOpen)}
                  onBlur={() => setTimeout(() => setIsManualDeployOpen(false), 200)}
                  className="h-10 px-4 flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] dark:bg-[#272727] dark:hover:bg-[#333] text-white font-medium border border-transparent transition-colors rounded-sm"
                >
                  Manual Deploy
                </button>
                {isManualDeployOpen && (
                  <div className="z-[9999] outline-none theme dark" style={{ position: 'absolute', right: '0px', top: '100%', marginTop: '4px' }}>
                    <div className="min-w-[208px] p-4 bg-[#0d0d0d] border border-solid border-[#4d4d4d] shadow-xl outline-none whitespace-nowrap rounded-sm">
                      <button type="button" className="w-full flex relative text-[15px] text-[#e3e3e3] py-2 px-3 whitespace-nowrap outline-2 cursor-pointer hover:text-[#e3e3e3] hover:bg-[#272727] rounded-sm transition-colors text-left">
                        <div className="w-full flex items-center space-x-2.5">
                          <span className="flex-1 truncate">Deploy latest commit</span>
                        </div>
                      </button>
                      <button type="button" className="w-full flex relative text-[15px] text-[#e3e3e3] py-2 px-3 whitespace-nowrap outline-2 cursor-pointer hover:text-[#e3e3e3] hover:bg-[#272727] rounded-sm transition-colors text-left mt-1">
                        <div className="w-full flex items-center space-x-2.5">
                          <span className="flex-1 truncate">Deploy a specific commit</span>
                        </div>
                      </button>
                      <button type="button" className="w-full flex relative text-[15px] text-[#e3e3e3] py-2 px-3 whitespace-nowrap outline-2 cursor-pointer hover:text-[#e3e3e3] hover:bg-[#272727] rounded-sm transition-colors text-left mt-1">
                        <div className="w-full flex items-center space-x-2.5">
                          <span className="flex-1 truncate">Clear build cache &amp; deploy</span>
                        </div>
                      </button>
                      <div role="separator" className="px-3 py-2">
                        <div className="w-full h-px border-b border-[#4d4d4d]"></div>
                      </div>
                      <button type="button" className="w-full flex relative text-[15px] text-[#e3e3e3] py-2 px-3 whitespace-nowrap outline-2 cursor-pointer hover:text-[#e3e3e3] hover:bg-[#272727] rounded-sm transition-colors text-left">
                        <div className="w-full flex items-center space-x-2.5">
                          <span className="flex-1 truncate">Restart service</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-base">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[15px]">
                <span className="text-gray-500 dark:text-[#8f8f8f]">Service ID:</span>
                <span className="text-gray-900 dark:text-[#f0f0f0] font-mono flex items-center gap-1">
                  {serviceId || 'srv-danaaubm8hqs73al0480'}
                  <button onClick={() => copyToClipboard(serviceId || 'srv-danaaubm8hqs73al0480')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
                </span>
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                <FaGithub className="w-4 h-4 text-gray-900 dark:text-white" />
                <a href="#" className="text-[#3b82f6] hover:underline flex items-center gap-1">
                  shanelperera-exe / {serviceId || 'settle-distributed-backend'}
                </a>
                <span className="text-gray-900 dark:text-[#f0f0f0] flex items-center gap-1 ml-2">
                  <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16"><path d="M13 9C12.5578 9.00128 12.1285 9.14923 11.7794 9.42069C11.4303 9.69214 11.1812 10.0717 11.071 10.5H8.99998C8.60229 10.4996 8.22102 10.3414 7.93981 10.0602C7.6586 9.77897 7.50042 9.3977 7.49998 9V7C7.49808 6.45731 7.3179 5.93028 6.98718 5.5H11.071C11.1927 5.97133 11.4821 6.3821 11.885 6.65531C12.2879 6.92851 12.7766 7.0454 13.2595 6.98406C13.7424 6.92273 14.1864 6.68737 14.5081 6.32212C14.8299 5.95687 15.0075 5.48679 15.0075 5C15.0075 4.51322 14.8299 4.04314 14.5081 3.67789C14.1864 3.31264 13.7424 3.07728 13.2595 3.01595C12.7766 2.95461 12.2879 3.0715 11.885 3.3447C11.4821 3.61791 11.1927 4.02868 11.071 4.5H4.92898C4.80729 4.02868 4.51787 3.61791 4.11498 3.3447C3.71209 3.0715 3.22339 2.95461 2.74048 3.01595C2.25758 3.07728 1.81362 3.31264 1.49182 3.67789C1.17003 4.04314 0.992493 4.51322 0.992493 5C0.992493 5.48679 1.17003 5.95687 1.49182 6.32212C1.81362 6.68737 2.25758 6.92273 2.74048 6.98406C3.22339 7.0454 3.71209 6.92851 4.11498 6.65531C4.51787 6.3821 4.80729 5.97133 4.92898 5.5H4.99998C5.39768 5.50044 5.77895 5.65862 6.06016 5.93983C6.34137 6.22104 6.49955 6.60231 6.49998 7V9C6.50076 9.66281 6.76441 10.2982 7.23308 10.7669C7.70175 11.2356 8.33718 11.4992 8.99998 11.5H11.071C11.1651 11.8614 11.3587 12.1891 11.6297 12.446C11.9007 12.7029 12.2383 12.8786 12.6042 12.9532C12.9701 13.0278 13.3496 12.9984 13.6996 12.8682C14.0496 12.7379 14.356 12.5122 14.5841 12.2165C14.8123 11.9209 14.9529 11.5672 14.9901 11.1956C15.0273 10.8241 14.9595 10.4495 14.7946 10.1145C14.6296 9.77954 14.374 9.49752 14.0567 9.30051C13.7395 9.1035 13.3734 8.99939 13 9ZM13 4C13.1978 4 13.3911 4.05865 13.5556 4.16854C13.72 4.27842 13.8482 4.4346 13.9239 4.61732C13.9996 4.80005 14.0194 5.00111 13.9808 5.1951C13.9422 5.38908 13.8469 5.56726 13.7071 5.70711C13.5672 5.84696 13.3891 5.9422 13.1951 5.98079C13.0011 6.01938 12.8 5.99957 12.6173 5.92388C12.4346 5.8482 12.2784 5.72002 12.1685 5.55557C12.0586 5.39113 12 5.19779 12 5C12.0003 4.73488 12.1057 4.4807 12.2932 4.29323C12.4807 4.10576 12.7349 4.00031 13 4ZM2.99998 6C2.8022 6 2.60886 5.94136 2.44441 5.83147C2.27996 5.72159 2.15179 5.56541 2.0761 5.38269C2.00042 5.19996 1.98061 4.9989 2.0192 4.80491C2.05778 4.61093 2.15302 4.43275 2.29288 4.2929C2.43273 4.15305 2.61091 4.0578 2.80489 4.01922C2.99887 3.98063 3.19994 4.00044 3.38267 4.07613C3.56539 4.15181 3.72157 4.27999 3.83145 4.44443C3.94134 4.60888 3.99998 4.80222 3.99998 5C3.99972 5.26514 3.89428 5.51934 3.7068 5.70682C3.51932 5.8943 3.26512 5.99974 2.99998 6ZM13 12C12.8022 12 12.6089 11.9414 12.4444 11.8315C12.28 11.7216 12.1518 11.5654 12.0761 11.3827C12.0004 11.2 11.9806 10.9989 12.0192 10.8049C12.0578 10.6109 12.153 10.4328 12.2929 10.2929C12.4327 10.153 12.6109 10.0578 12.8049 10.0192C12.9989 9.98063 13.1999 10.0004 13.3827 10.0761C13.5654 10.1518 13.7216 10.28 13.8315 10.4444C13.9413 10.6089 14 10.8022 14 11C13.9996 11.2651 13.8942 11.5193 13.7067 11.7067C13.5192 11.8942 13.2651 11.9996 13 12Z"></path></svg> 
                  main
                </span>
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                <a href="#" className="text-[#3b82f6] hover:underline">
                  https://{serviceId || 'settle-distributed-backend'}.onrender.com
                </a>
                <button onClick={() => copyToClipboard(`https://${serviceId || 'settle-distributed-backend'}.onrender.com`)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"><Copy className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">

        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search deploys and commits" 
            className="w-full h-10 bg-transparent border border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-[#6b6b6b] rounded-sm pl-10 pr-4 text-sm focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] focus:outline-none dark:text-white transition-colors"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#8f8f8f]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Deploys List */}
        <div>
          <div className="grid grid-cols-12 gap-4 pb-3 border-b border-gray-300 dark:border-[#525252] text-xs font-mono font-medium text-gray-500 dark:text-[#8f8f8f] uppercase tracking-wider">
            <div className="col-span-8 flex items-center gap-2">
              DEPLOY
              <span className="inline-flex items-center justify-center px-1.5 h-4 bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-gray-300 rounded-sm font-sans text-[10px]">1</span>
            </div>
            <div className="col-span-2 hidden md:block">TRIGGER</div>
            <div className="col-span-2 hidden md:block">DURATION</div>
          </div>

          <div className="flex flex-col">
            <div className="grid grid-cols-12 gap-4 py-4 border-b border-gray-300 dark:border-[#525252] items-start hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors cursor-pointer group rounded-sm px-2 -mx-2">
              <div className="col-span-12 md:col-span-8 flex gap-4">
                <div className="mt-1 flex-shrink-0">
                  <div className="bg-[#af1d27] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide">
                    <XCircle className="w-3 h-3" /> Failed
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-[#f0f0f0] group-hover:text-[#3b82f6] truncate">hotfix/change the gren color varient</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8f8f8f]">
                    <span className="font-mono bg-gray-100 dark:bg-[#272727] px-1.5 py-0.5 rounded-sm">5a0347d</span>
                    <span>•</span>
                    <span className="truncate">Deployed 2h ago</span>
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-1 hidden md:block">
                First Deploy
              </div>
              <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-1 font-mono hidden md:block">
                12.5s
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
