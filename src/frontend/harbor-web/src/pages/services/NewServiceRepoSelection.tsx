import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdPublic } from 'react-icons/md';
import { formatDistanceToNow } from 'date-fns';
import { Icon } from '../../components/icons';

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
          // detail carries the server-side cause (e.g. a GitHub credential failure); message alone
          // hides it behind a generic title.
          const reason = data?.detail || data?.title || data?.message || 'Failed to fetch repositories.';
          throw new Error(reason);
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
          time: r.updatedAt ? formatDistanceToNow(new Date(r.updatedAt), { addSuffix: true }) : ''
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
                      <Icon name="wrench" className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#8f8f8f] left-3 pointer-events-none" />
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
                        <Icon name="github" className="w-3.5 h-3.5" />
                      </span>
                      Credentials (1)
                      <Icon name="chevronDown" className={`w-4 h-4 ml-1 transition-transform ${isCredentialsOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCredentialsOpen && (
                      <div className="absolute right-0 top-full mt-1 w-[300px] bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#4d4d4d] rounded-sm shadow-lg z-10 flex flex-col font-sans text-[16px]">
                        <div className="p-4 h-[92px] flex flex-col justify-center">
                          <h6 className="text-[14px] text-gray-500 dark:text-[#b3b3b3] uppercase mb-2" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>Connected deployment credentials</h6>
                          <button className="w-full flex items-center justify-between px-[12px] py-[8px] bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#333333] transition-colors rounded-sm group h-[36px] outline-none">
                            <div className="flex items-center space-x-2">
                              <Icon name="github" className="w-4 h-4 text-gray-900 dark:text-white" />
                              <span className="text-[14px] leading-[20px] text-gray-900 dark:text-[#e3e3e3]">shanelperera-exe</span>
                              <span className="text-[12px] font-medium text-gray-500 dark:text-[#b3b3b3]">42 repos</span>
                            </div>
                            <Icon name="chevronRightBold" className="w-4 h-4 text-gray-400 dark:text-[#8f8f8f] group-hover:text-gray-900 dark:group-hover:text-white" />
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
                        <Icon name="github" className="w-5 h-5" />
                      </span>
                      <div className="flex space-x-1 items-center truncate text-[16px]">
                        <span className="truncate">{repo.owner}</span>
                        <span className="text-gray-400 dark:text-[#8f8f8f]">/</span>
                        <span className="truncate font-medium">{repo.name}</span>
                        {repo.isPrivate ? (
                          <Icon name="lock" className="self-center w-3.5 h-3.5 text-gray-500 dark:text-[#8f8f8f]" />
                        ) : (
                          <MdPublic className="self-center w-3.5 h-3.5 text-gray-500 dark:text-[#8f8f8f]" />
                        )}
                      </div>
                      <span className="hidden md:inline-block text-[14px] text-gray-500 dark:text-[#b3b3b3] px-3 text-nowrap">
                        {repo.time}
                      </span>
                      <span className="ml-auto hidden group-hover:inline-block">
                          <a href={repo.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-[14px] text-[#3b82f6] hover:underline outline-none" onClick={(e) => e.stopPropagation()}>
                          View repo
                          <Icon name="box" className="w-4 h-4 ml-1" />
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
                    <Icon name="github" className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#8f8f8f] left-3 pointer-events-none" />
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
