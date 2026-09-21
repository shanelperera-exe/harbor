import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const NewServiceRepoSelection: React.FC = () => {
  const { projectId, serviceType } = useParams<{ projectId: string, serviceType: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'git' | 'public'>('git');
  const [searchQuery, setSearchQuery] = useState('');
  const [publicRepoUrl, setPublicRepoUrl] = useState('');
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCredentialsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState('');
  
  useEffect(() => {
    async function loadRepos() {
      const token = localStorage.getItem('harbor_token');
      if (!token) return;
      
      setLoadingRepos(true);
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiBase}/projects/githubintegration/repositories`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.title || data?.detail || data?.message || 'Failed to fetch repositories.');
        }
        
        // Map the backend structure to what the UI expects
        // Backend returns: [{ id, name, fullName, owner, htmlUrl, updatedAt, isPrivate, defaultBranch }]
        const formatted = (data.data || []).map((r: any) => ({
          id: r.id,
          owner: r.owner,
          name: r.name,
          fullName: r.fullName,
          url: r.htmlUrl,
          defaultBranch: r.defaultBranch,
          isPrivate: r.private !== undefined ? r.private : r.Private,
          time: r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : ''
        }));
        setRepos(formatted);
      } catch (err: any) {
        setRepoError(err.message);
      } finally {
        setLoadingRepos(false);
      }
    }
    
    if (activeTab === 'git') {
      void loadRepos();
    }
  }, [activeTab]);

  const handleRepoSelect = (repo: any) => {
    navigate(`/projects/${projectId}/services/new/${serviceType}/configure`, { state: { repo } });
  };

  const handlePublicRepoConnect = () => {
    if (!publicRepoUrl.trim()) return;
    
    let url = publicRepoUrl.trim();
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    
    let owner = 'public';
    let name = 'repository';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        owner = parts[0];
        name = parts[1];
      }
    } catch (e) {
      // simple fallback
    }
    
    const repo = {
      id: `public-${Date.now()}`,
      owner,
      name,
      fullName: `${owner}/${name}`,
      url,
      defaultBranch: 'main',
      time: 'Just now'
    };
    
    handleRepoSelect(repo);
  };

  const filteredRepos = repos.filter(repo => repo.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const serviceTitle = serviceType === 'static' ? 'Static Site' : 'Web Service';

  return (
    <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12 text-gray-900 dark:text-[#f0f0f0]">
      <div className="my-12">
        <h1 className="text-[32px] leading-[36px] font-medium break-words">
          New {serviceTitle}
        </h1>
      </div>
      
      <div className="grid xl:grid-cols-3 xl:gap-y-0 xl:gap-x-10 grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-y-0">
        <div className="col-span-1">
          <div className="flex items-center">
            <label className="inline-block text-[18px] font-medium mb-1">GitHub Repository</label>
          </div>
        </div>
        
        <div className="col-span-2">
          <ul className="flex">
            <li>
              <button
                type="button"
                onClick={() => setActiveTab('git')}
                className={`flex items-center gap-2 py-3 h-12 px-4 border border-solid -ml-px text-[16px] font-medium transition-colors outline-none rounded-sm ${
                  activeTab === 'git'
                    ? 'border-[#2563eb] bg-[#2563eb] text-white z-[2]'
                    : 'border-gray-300 dark:border-[#4d4d4d] text-gray-600 dark:text-[#c7c7c7] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-white z-[1]'
                }`}
              >
                Git Provider
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setActiveTab('public')}
                className={`flex items-center gap-2 py-3 h-12 px-4 border border-solid -ml-px text-[16px] font-medium transition-colors outline-none rounded-sm ${
                  activeTab === 'public'
                    ? 'border-[#2563eb] bg-[#2563eb] text-white z-[2]'
                    : 'border-gray-300 dark:border-[#4d4d4d] text-gray-600 dark:text-[#c7c7c7] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-white z-[1]'
                }`}
              >
                Public Git Repository
              </button>
            </li>
          </ul>

          <div className="mt-3">
            {activeTab === 'git' ? (
              <div className="flex flex-col justify-between">
                <div className="flex flex-row space-x-3">
                  <div className="grow">
                    <div className="flex relative">
                      <svg className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#8f8f8f] left-3 pointer-events-none" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M14.5 13.7931L10.7239 10.017C11.6313 8.9277 12.0838 7.5305 11.9872 6.11608C11.8907 4.70165 11.2525 3.37891 10.2055 2.423C9.15855 1.4671 7.78335 0.951637 6.366 0.983845C4.94865 1.01605 3.59828 1.59345 2.59581 2.59593C1.59333 3.5984 1.01593 4.94877 0.983723 6.36612C0.951515 7.78347 1.46698 9.15867 2.42288 10.2057C3.37879 11.2526 4.70153 11.8908 6.11596 11.9873C7.53038 12.0839 8.92758 11.6314 10.0169 10.7241L13.7929 14.5001L14.5 13.7931ZM2 6.50012C2 5.6101 2.26392 4.74007 2.75838 4.00005C3.25285 3.26003 3.95565 2.68325 4.77792 2.34266C5.60019 2.00207 6.50499 1.91295 7.3779 2.08658C8.25082 2.26022 9.05264 2.6888 9.68198 3.31814C10.3113 3.94747 10.7399 4.7493 10.9135 5.62221C11.0872 6.49513 10.998 7.39993 10.6575 8.22219C10.3169 9.04446 9.74008 9.74726 9.00006 10.2417C8.26004 10.7362 7.39001 11.0001 6.5 11.0001C5.30693 10.9988 4.1631 10.5243 3.31948 9.68064C2.47585 8.83701 2.00132 7.69319 2 6.50012Z"></path>
                      </svg>
                      <input
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-3 px-4 pl-10 h-12 bg-transparent border border-gray-300 dark:border-[#4d4d4d] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] text-[16px] rounded-sm transition-colors"
                      />
                    </div>
                  </div>
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsCredentialsOpen(!isCredentialsOpen)}
                      className="h-12 py-3 px-4 flex items-center border border-gray-300 dark:border-[#4d4d4d] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] transition-colors text-[16px] outline-none rounded-sm">
                      <span className="flex items-center space-x-1 mr-2">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
                      </span>
                      Credentials (1)
                      <svg className={`w-4 h-4 ml-1 transition-transform ${isCredentialsOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 16 16"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                    </button>

                    {isCredentialsOpen && (
                      <div className="absolute right-0 top-full mt-1 w-[300px] bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#4d4d4d] rounded-sm shadow-lg z-10 flex flex-col font-sans text-[16px]">
                        <div className="p-4 h-[92px] flex flex-col justify-center">
                          <h6 className="text-[14px] text-gray-500 dark:text-[#b3b3b3] uppercase mb-2" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>Connected deployment credentials</h6>
                          <button className="w-full flex items-center justify-between px-[12px] py-[8px] bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors rounded-sm group h-[36px] outline-none">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-gray-900 dark:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
                              <span className="text-[14px] leading-[20px] text-gray-900 dark:text-[#e3e3e3]">shanelperera-exe</span>
                              <span className="text-[12px] font-medium text-gray-500 dark:text-[#b3b3b3]">42 repos</span>
                            </div>
                            <svg className="w-4 h-4 text-gray-400 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-2 border border-gray-300 dark:border-[#4d4d4d] h-[244px] overflow-y-auto custom-scrollbar rounded-sm">
                  {loadingRepos && <div className="p-3 text-[14px] text-gray-500">Loading repositories...</div>}
                  {repoError && <div className="p-3 text-[14px] text-red-500">{repoError}</div>}
                  {!loadingRepos && filteredRepos.length === 0 && !repoError && (
                    <div className="p-3 text-[14px] text-gray-500">No repositories found.</div>
                  )}
                  {filteredRepos.map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => handleRepoSelect(repo)}
                      className="group w-full flex items-center h-12 px-4 py-3 hover:bg-gray-100 dark:hover:bg-[#ffffff1a] transition-colors outline-none"
                    >
                      <span className="inline-flex w-5 mr-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/></svg>
                      </span>
                      <div className="flex space-x-1 items-center truncate text-[16px]">
                        <span className="truncate">{repo.owner}</span>
                        <span className="text-gray-400 dark:text-[#8f8f8f]">/</span>
                        {repo.isPrivate && (
                          <svg fill="currentColor" className="self-center w-3 h-3 text-gray-500 dark:text-[#8f8f8f]" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 7.51172H11V4.51172C11 3.71607 10.6839 2.95301 10.1213 2.3904C9.55871 1.82779 8.79565 1.51172 8 1.51172C7.20435 1.51172 6.44129 1.82779 5.87868 2.3904C5.31607 2.95301 5 3.71607 5 4.51172V7.51172H4C3.73478 7.51172 3.48043 7.61708 3.29289 7.80461C3.10536 7.99215 3 8.2465 3 8.51172V14.5117C3 14.7769 3.10536 15.0313 3.29289 15.2188C3.48043 15.4064 3.73478 15.5117 4 15.5117H12C12.2652 15.5117 12.5196 15.4064 12.7071 15.2188C12.8946 15.0313 13 14.7769 13 14.5117V8.51172C13 8.2465 12.8946 7.99215 12.7071 7.80461C12.5196 7.61708 12.2652 7.51172 12 7.51172ZM6 4.51172C6 3.98129 6.21071 3.47258 6.58579 3.09751C6.96086 2.72243 7.46957 2.51172 8 2.51172C8.53043 2.51172 9.03914 2.72243 9.41421 3.09751C9.78929 3.47258 10 3.98129 10 4.51172V7.51172H6V4.51172ZM12 14.5117H4V8.51172H12V14.5117Z"></path>
                          </svg>
                        )}
                        <span className="truncate font-medium">{repo.name}</span>
                      </div>
                      <span className="hidden md:inline-block text-[14px] text-gray-500 dark:text-[#b3b3b3] px-3 text-nowrap">
                        {repo.time}
                      </span>
                      <span className="ml-auto hidden group-hover:inline-block">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-[14px] text-[#2563eb] hover:underline outline-none" onClick={(e) => e.stopPropagation()}>
                          View repo
                          <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 16 16"><path d="M13 14H3C2.73489 13.9996 2.48075 13.8942 2.29329 13.7067C2.10583 13.5193 2.00036 13.2651 2 13V3C2.00036 2.73489 2.10583 2.48075 2.29329 2.29329C2.48075 2.10583 2.73489 2.00036 3 2H8V3H3V13H13V8H14V13C13.9996 13.2651 13.8942 13.5193 13.7067 13.7067C13.5193 13.8942 13.2651 13.9996 13 14Z"></path><path d="M10 1V2H13.293L9 6.293L9.707 7L14 2.707V6H15V1H10Z"></path></svg>
                        </a>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="text-[14px] text-gray-600 dark:text-[#c7c7c7] mb-3">
                  Deploy applications from any public Git repository.
                </div>
                <div className="flex items-center">
                  <div className="flex relative w-full">
                    <svg className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#8f8f8f] left-3 pointer-events-none" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.285 0 .315.21.69.825.57C20.565 21.795 24 17.31 24 12c0-6.63-5.37-12-12-12z"/>
                    </svg>
                    <input
                      placeholder="https://github.com/render-examples/sveltekit-static"
                      className="w-full py-3 px-4 pl-10 h-12 bg-transparent border border-gray-300 dark:border-[#4d4d4d] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] text-[16px] rounded-sm transition-colors"
                      value={publicRepoUrl}
                      onChange={(e) => setPublicRepoUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePublicRepoConnect()}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button 
                    disabled={!publicRepoUrl.trim()} 
                    onClick={handlePublicRepoConnect}
                    className="h-12 px-6 py-3 bg-[#2563eb] text-white text-[16px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center outline-none hover:bg-[#1d4ed8] rounded-sm"
                  >
                    Connect &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default NewServiceRepoSelection;
