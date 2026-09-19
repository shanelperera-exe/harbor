import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';

const NewServiceConfigure: React.FC = () => {
  const { projectId, serviceType } = useParams<{ projectId: string, serviceType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const repo = location.state?.repo;

  const [name, setName] = useState(repo?.name || '');
  const [branch, setBranch] = useState(repo?.defaultBranch || 'main');
  const [rootDir, setRootDir] = useState('');
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Need to fetch current project name to display in the Project dropdown
  const [projectName, setProjectName] = useState('Loading...');

  useEffect(() => {
    if (!repo) {
      navigate(`/projects/${projectId}/services/new/${serviceType}`);
    }
    
    // Fetch project name
    const fetchProject = async () => {
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProjectName(data.data?.name || `Project ${projectId}`);
        }
      } catch (e) {
        setProjectName(`Project ${projectId}`);
      }
    };
    if (projectId) {
      fetchProject();
    }
  }, [repo, navigate, projectId, serviceType]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };
  
  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };
  
  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branch.trim()) {
      setError('Name and Branch are required.');
      return;
    }

    const token = localStorage.getItem('harbor_token');
    if (!token) {
      setError('Not authenticated.');
      return;
    }

    setIsDeploying(true);
    setError('');

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/projects/${projectId}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          type: serviceType,
          repositoryUrl: repo.url,
          repositoryName: repo.fullName,
          repositoryBranch: branch.trim(),
          // We could send envVars and rootDir here if backend supports it later
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || data?.title || 'Failed to create service.');
      }

      navigate(`/projects/${projectId}/settings`); 
    } catch (err: any) {
      setError(err.message);
      setIsDeploying(false);
    }
  };

  if (!repo) return null;

  const serviceTitle = serviceType === 'static' ? 'Static Site' : 'Web Service';

  return (
    <div className="flex flex-grow text-gray-900 dark:text-[#f0f0f0]">
      <div className="w-full">
        <div>
          <main className="w-full max-w-[1920px] mx-auto px-4 mb-20 md:px-12">
            <div className="my-12">
              <div>
                <h1 className="text-[32px] leading-10 font-medium break-words text-gray-900 dark:text-white">
                  New {serviceTitle}
                </h1>
              </div>
            </div>

            {/* Source Code Section */}
            <div className="grid xl:grid-cols-3 xl:gap-y-0 xl:gap-x-10 grid-cols-1 md:grid-cols-3 gap-y-2 md:gap-y-0 mb-8">
              <div className="col-span-1">
                <div className="flex items-center">
                  <label className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Github Repository</label>
                </div>
              </div>
              <div className="col-span-2 text-gray-600 dark:text-[#c7c7c7]">
                <div className="flex bg-transparent text-gray-900 dark:text-[#f0f0f0] items-center h-14 pl-4 pr-2 py-2 border border-solid border-gray-300 dark:border-[#4d4d4d] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">
                  <span className="inline-flex w-7">
                    <svg width="20" height="20" viewBox="0 0 24 23" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 text-gray-900 dark:text-[#f0f0f0]" aria-label="GitHub"><path fillRule="evenodd" clipRule="evenodd" d="M12.0183 0.405518C5.73469 0.405518 0.655029 5.50047 0.655029 11.8036C0.655029 16.8421 3.90974 21.107 8.42489 22.6165C8.9894 22.73 9.19618 22.3712 9.19618 22.0695C9.19618 21.8052 9.17757 20.8995 9.17757 19.9558C6.01659 20.6352 5.35835 18.597 5.35835 18.597C4.85036 17.2761 4.09768 16.9365 4.09768 16.9365C3.06309 16.2383 4.17304 16.2383 4.17304 16.2383C5.32067 16.3138 5.92286 17.4083 5.92286 17.4083C6.9386 19.1443 8.57538 18.6538 9.23386 18.3518C9.32782 17.6158 9.62904 17.1063 9.94886 16.8233C7.42775 16.5591 4.77523 15.5778 4.77523 11.1996C4.77523 9.95415 5.22647 8.93516 5.94146 8.14266C5.82866 7.85966 5.43348 6.68944 6.05451 5.12321C6.05451 5.12321 7.01396 4.82122 9.17733 6.2932C10.1036 6.0437 11.0587 5.91677 12.0183 5.91571C12.9777 5.91571 13.9558 6.04794 14.8589 6.2932C17.0226 4.82122 17.982 5.12321 17.982 5.12321C18.603 6.68944 18.2076 7.85966 18.0948 8.14266C18.8287 8.93516 19.2613 9.95415 19.2613 11.1996C19.2613 15.5778 16.6088 16.5401 14.0688 16.8233C14.4828 17.1818 14.8401 17.861 14.8401 18.9368C14.8401 20.4653 14.8215 21.692 14.8215 22.0692C14.8215 22.3712 15.0285 22.73 15.5928 22.6167C20.1079 21.1068 23.3626 16.8421 23.3626 11.8036C23.3813 5.50047 18.283 0.405518 12.0183 0.405518Z"></path></svg>
                  </span>
                  <a rel="noopener noreferrer" className="group inline-flex items-center cursor-pointer outline-none text-[#60a5fa] hover:text-[#93c5fd] text-[16px] no-underline p-0 transition-colors" target="_blank" href={repo.url}>
                    {repo.owner} <span className="text-[#b3b3b3] px-1">/</span> {repo.name}
                  </a>
                  <span className="hidden md:inline-block">
                    <span role="separator" className="text-[14px] select-none text-[#b3b3b3] mx-2">•</span>
                    <span className="text-[12px] text-[#b3b3b3]">
                      {repo.time ? `${repo.time}` : 'Connected'}
                    </span>
                  </span>
                  <div className="hidden md:inline-block text-nowrap text-right ml-auto">
                    <Link to={`/projects/${projectId}/services/new/${serviceType}`} className="text-[12px] text-gray-600 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-[#f0f0f0] h-8 py-1.5 px-2 outline-none flex items-center group transition-colors rounded">
                      <div className="inline-flex w-4 h-4 me-1.5">
                        <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M15 13H1V14H15V13Z"></path><path d="M12.7 4.5C13.1 4.1 13.1 3.5 12.7 3.1L10.9 1.3C10.5 0.9 9.9 0.9 9.5 1.3L2 8.8V12H5.2L12.7 4.5ZM10.2 2L12 3.8L10.5 5.3L8.7 3.5L10.2 2ZM3 11V9.2L8 4.2L9.8 6L4.8 11H3Z"></path></svg>
                      </div>
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <form className="space-y-8" noValidate onSubmit={handleDeploy}>
              {/* Name */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <label htmlFor="serviceName" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Name</label>
                  </div>
                  <div className="text-gray-600 dark:text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">A unique name for your service.</div>
                </div>
                <div className="col-span-2 text-[#c7c7c7]">
                  <div>
                    <div className="flex flex-col">
                      <div className="flex relative">
                        <input id="serviceName" placeholder="example-service-name" className="h-12 truncate text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] transition-colors" type="text" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project */}
              <fieldset className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <legend className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">
                      Project
                      <span className="ml-2 text-[#2563eb] text-[16px] font-normal tracking-[0.16px] normal-case">Optional</span>
                    </legend>
                  </div>
                  <p className="text-gray-600 dark:text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">
                    Add this {serviceTitle.toLowerCase()} to a <a rel="noopener noreferrer" target="_blank" className="text-[#2563eb] hover:underline" href="#">project</a> once it's created.
                  </p>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-col lg:flex-row w-full gap-y-2 justify-between items-stretch">
                    
                    <div className="group flex-1 lg:min-w-[10rem] lg:max-w-[60%]">
                      <div className="relative">
                        <button type="button" disabled className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-[#272727] rounded-none appearance-none cursor-not-allowed text-[#6b6b6b] h-12 text-left flex items-center">
                          <span className="flex flex-1 items-center min-w-0 pr-6">
                            <span className="inline-flex mr-2">
                              <svg fill="currentColor" className="w-4 h-4 text-inherit" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path></svg>
                            </span>
                            <span className="w-full truncate">{projectName}</span>
                          </span>
                          <svg fill="currentColor" aria-hidden="true" className="absolute top-0 bottom-0 my-auto right-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                        </button>
                      </div>
                    </div>

                    <span className="hidden lg:flex h-12 shrink-0 items-center">
                      <span aria-hidden="true" className="mx-4 text-[#4d4d4d] text-[16px] select-none">/</span>
                    </span>

                    <div className="group flex-1 lg:min-w-[10rem] lg:max-w-[60%]">
                      <div className="relative">
                        <button type="button" disabled className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-[#272727] rounded-none appearance-none cursor-not-allowed text-[#6b6b6b] h-12 text-left flex items-center">
                          <span className="flex flex-1 items-center min-w-0 pr-6">
                            <span className="inline-flex mr-2">
                              <svg fill="currentColor" className="w-4 h-4 text-inherit" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                            </span>
                            <span className="w-full truncate"><span className="flex items-center gap-2">Production </span></span>
                          </span>
                          <svg fill="currentColor" aria-hidden="true" className="absolute top-0 bottom-0 my-auto right-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Branch */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <label htmlFor="branch" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Branch</label>
                  </div>
                  <div className="text-gray-600 dark:text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">The Git branch to build and deploy.</div>
                </div>
                <div className="col-span-2 text-[#c7c7c7]">
                  <div>
                    <div className="flex flex-col">
                      <div className="flex relative">
                        <svg fill="currentColor" aria-hidden="true" className="absolute inset-y-0 my-auto w-4 h-4 text-gray-400 dark:text-[#f0f0f0] pointer-events-none left-3" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M13 9C12.5578 9.00128 12.1285 9.14923 11.7794 9.42069C11.4303 9.69214 11.1812 10.0717 11.071 10.5H8.99998C8.60229 10.4996 8.22102 10.3414 7.93981 10.0602C7.6586 9.77897 7.50042 9.3977 7.49998 9V7C7.49808 6.45731 7.3179 5.93028 6.98718 5.5H11.071C11.1927 5.97133 11.4821 6.3821 11.885 6.65531C12.2879 6.92851 12.7766 7.0454 13.2595 6.98406C13.7424 6.92273 14.1864 6.68737 14.5081 6.32212C14.8299 5.95687 15.0075 5.48679 15.0075 5C15.0075 4.51322 14.8299 4.04314 14.5081 3.67789C14.1864 3.31264 13.7424 3.07728 13.2595 3.01595C12.7766 2.95461 12.2879 3.0715 11.885 3.3447C11.4821 3.61791 11.1927 4.02868 11.071 4.5H4.92898C4.80729 4.02868 4.51787 3.61791 4.11498 3.3447C3.71209 3.0715 3.22339 2.95461 2.74048 3.01595C2.25758 3.07728 1.81362 3.31264 1.49182 3.67789C1.17003 4.04314 0.992493 4.51322 0.992493 5C0.992493 5.48679 1.17003 5.95687 1.49182 6.32212C1.81362 6.68737 2.25758 6.92273 2.74048 6.98406C3.22339 7.0454 3.71209 6.92851 4.11498 6.65531C4.51787 6.3821 4.80729 5.97133 4.92898 5.5H4.99998C5.39768 5.50044 5.77895 5.65862 6.06016 5.93983C6.34137 6.22104 6.49955 6.60231 6.49998 7V9C6.50076 9.66281 6.76441 10.2982 7.23308 10.7669C7.70175 11.2356 8.33718 11.4992 8.99998 11.5H11.071C11.1651 11.8614 11.3587 12.1891 11.6297 12.446C11.9007 12.7029 12.2383 12.8786 12.6042 12.9532C12.9701 13.0278 13.3496 12.9984 13.6996 12.8682C14.0496 12.7379 14.356 12.5122 14.5841 12.2165C14.8123 11.9209 14.9529 11.5672 14.9901 11.1956C15.0273 10.8241 14.9595 10.4495 14.7946 10.1145C14.6296 9.77954 14.374 9.49752 14.0567 9.30051C13.7395 9.1035 13.3734 8.99939 13 9ZM13 4C13.1978 4 13.3911 4.05865 13.5556 4.16854C13.72 4.27842 13.8482 4.4346 13.9239 4.61732C13.9996 4.80005 14.0194 5.00111 13.9808 5.1951C13.9422 5.38908 13.8469 5.56726 13.7071 5.70711C13.5672 5.84696 13.3891 5.9422 13.1951 5.98079C13.0011 6.01938 12.8 5.99957 12.6173 5.92388C12.4346 5.8482 12.2784 5.72002 12.1685 5.55557C12.0586 5.39113 12 5.19779 12 5C12.0003 4.73488 12.1057 4.4807 12.2932 4.29323C12.4807 4.10576 12.7349 4.00031 13 4ZM2.99998 6C2.8022 6 2.60886 5.94136 2.44441 5.83147C2.27996 5.72159 2.15179 5.56541 2.0761 5.38269C2.00042 5.19996 1.98061 4.9989 2.0192 4.80491C2.05778 4.61093 2.15302 4.43275 2.29288 4.2929C2.43273 4.15305 2.61091 4.0578 2.80489 4.01922C2.99887 3.98063 3.19994 4.00044 3.38267 4.07613C3.56539 4.15181 3.72157 4.27999 3.83145 4.44443C3.94134 4.60888 3.99998 4.80222 3.99998 5C3.99972 5.26514 3.89428 5.51934 3.7068 5.70682C3.51932 5.8943 3.26512 5.99974 2.99998 6ZM13 12C12.8022 12 12.6089 11.9414 12.4444 11.8315C12.28 11.7216 12.1518 11.5654 12.0761 11.3827C12.0004 11.2 11.9806 10.9989 12.0192 10.8049C12.0578 10.6109 12.153 10.4328 12.2929 10.2929C12.4327 10.153 12.6109 10.0578 12.8049 10.0192C12.9989 9.98063 13.1999 10.0004 13.3827 10.0761C13.5654 10.1518 13.7216 10.28 13.8315 10.4444C13.9413 10.6089 14 10.8022 14 11C13.9996 11.2651 13.8942 11.5193 13.7067 11.7067C13.5192 11.8942 13.2651 11.9996 13 12Z"></path></svg>
                        <input id="branch" placeholder="Search" className="truncate text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] pl-9 pr-12 h-12 transition-colors" type="text" value={branch} onChange={e => setBranch(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Root Directory */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <label htmlFor="rootDir" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">
                      Root Directory
                      <span className="ml-2 text-[#2563eb] text-[16px] font-normal tracking-[0.16px] normal-case">Optional</span>
                    </label>
                  </div>
                  <div className="text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">
                    If set, Harbor runs commands from this directory instead of the repository root.
                  </div>
                </div>
                <div className="col-span-2 text-[#c7c7c7]">
                  <div>
                    <div className="flex flex-col">
                      <div className="flex relative">
                        <input id="rootDir" placeholder="e.g. src" className="h-12 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] transition-colors" type="text" value={rootDir} onChange={e => setRootDir(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <div id="environment-variables" className="p-6 md:p-8 bg-transparent border border-solid border-gray-300 dark:border-[#4d4d4d] scroll-mt-20">
                  <div className="mb-8">
                    <div className="flex justify-between">
                      <div className="flex-1 small:pr-4">
                        <div>
                          <h4 className="text-gray-900 dark:text-white text-[20px] font-semibold">Environment Variables</h4>
                        </div>
                        <div className="text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case text-gray-600 dark:text-[#c7c7c7] mt-1 max-w-xl">
                          Set environment-specific config and secrets (such as API keys), then read those values from your code.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[14px] text-gray-900 dark:text-[#f0f0f0]">
                    <div className="col-span-2 mt-0">
                      {envVars.length > 0 && (
                        <table className="w-full border border-solid border-gray-300 dark:border-[#4d4d4d] mb-5">
                          <thead className="border-b border-solid border-gray-300 dark:border-[#4d4d4d]">
                            <tr>
                              <th scope="col" className="w-1/3 py-3 pl-7 pr-4 text-left uppercase text-[12px] font-mono text-gray-900 dark:text-[#f0f0f0]">Key</th>
                              <th scope="col" className="py-3 pl-2 pr-4 text-left uppercase text-[12px] font-mono text-gray-900 dark:text-[#f0f0f0]">Value</th>
                              <th scope="col" className="w-px pr-4"><span className="sr-only">Delete</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {envVars.map((envVar, idx) => (
                              <tr key={idx}>
                                <td className="w-1/3 p-4 pt-4 align-top">
                                  <div className="flex flex-col">
                                    <div className="flex relative">
                                        <input 
                                          placeholder="NAME_OF_VARIABLE" 
                                          className="h-12 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] transition-colors" 
                                          type="text" 
                                          value={envVar.key} 
                                        onChange={(e) => handleEnvChange(idx, 'key', e.target.value)} 
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="pb-4 pr-4 pt-4 align-top">
                                  <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
                                    <div className="flex flex-col w-full">
                                      <div className="flex relative">
                                        <textarea 
                                          rows={1} 
                                          placeholder="value" 
                                          className="font-mono text-[16px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-none appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] min-h-12 py-3 transition-colors" 
                                          value={envVar.value}
                                          onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                                        ></textarea>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="w-px pb-4 pr-4 pt-4 align-top">
                                  <button onClick={() => handleRemoveEnvVar(idx)} type="button" aria-label="Delete" className="text-red-500 dark:text-[#f0989e] hover:text-white hover:bg-red-600 h-12 py-3 px-3 outline-none flex items-center transition-colors">
                                    <svg fill="currentColor" width="16" height="17" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg"><path d="M7 6.66699H6V12.667H7V6.66699Z"></path><path d="M10 6.66699H9V12.667H10V6.66699Z"></path><path d="M2 3.66699V4.66699H3V14.667C3 14.9322 3.10536 15.1866 3.29289 15.3741C3.48043 15.5616 3.73478 15.667 4 15.667H12C12.2652 15.667 12.5196 15.5616 12.7071 15.3741C12.8946 15.1866 13 14.9322 13 14.667V4.66699H14V3.66699H2ZM4 14.667V4.66699H12V14.667H4Z"></path><path d="M10 1.66699H6V2.66699H10V1.66699Z"></path></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      
                      <div className="flex-wrap mt-5 flex gap-3">
                        <button type="button" onClick={handleAddEnvVar} className="text-[14px] text-gray-700 dark:text-[#e3e3e3] hover:text-[#2563eb] hover:border-[#2563eb] border border-solid border-gray-300 dark:border-[#4d4d4d] h-10 py-2.5 px-3 flex items-center transition-colors outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] bg-transparent">
                          <div className="inline-flex w-4 h-4 me-1.5">
                            <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
                          </div>
                          Add Environment Variable
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Accordion */}
              <ul className="space-y-1 mt-8">
                <li className="border border-solid border-gray-300 dark:border-[#4d4d4d]">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} type="button" className="w-full flex items-center text-[20px] font-semibold space-x-2 text-left p-4 text-gray-900 dark:text-[#e3e3e3] hover:text-gray-900 dark:hover:text-[#f0f0f0] bg-transparent hover:bg-gray-100 dark:hover:bg-[#ffffff1a] outline-none transition-colors">
                      <svg fill="currentColor" aria-hidden="true" className={`flex-shrink-0 w-6 h-6 transition-transform ${isAdvancedOpen ? '' : '-rotate-90'}`} width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8 10.9998L3 5.9998L3.7 5.2998L8 9.5998L12.3 5.2998L13 5.9998L8 10.9998Z"></path></svg>
                      <span>Advanced</span>
                    </button>
                  </div>
                  {isAdvancedOpen && (
                    <div className="p-6 md:p-8 bg-transparent border-t border-solid border-gray-300 dark:border-[#4d4d4d]">
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                        <div className="col-span-1">
                          <div className="inline-block text-[18px] font-semibold tracking-[0.16px] text-gray-900 dark:text-[#f0f0f0] mb-2">Secret Files</div>
                          <div className="space-y-2 text-[16px] leading-[24px] font-normal tracking-[0.16px] text-gray-600 dark:text-[#c7c7c7]">
                            <div>Store plaintext files containing secret data (such as a <code className="px-1 py-0.5 font-mono text-[14px] bg-gray-200 dark:bg-[#141414] rounded">.env</code> file or a private key).</div>
                            <div>Access during builds and at runtime from your app's root, or from <code className="px-1 py-0.5 font-mono text-[14px] bg-gray-200 dark:bg-[#141414] rounded">/etc/secrets/&lt;filename&gt;</code>.</div>
                          </div>
                        </div>
                        <div className="col-span-2 mt-0">
                          <button type="button" className="text-[14px] text-gray-700 dark:text-[#e3e3e3] hover:text-[#2563eb] hover:border-[#2563eb] border border-solid border-gray-300 dark:border-[#4d4d4d] h-10 py-2.5 px-3 flex items-center transition-colors outline-none focus-visible:border-[#2563eb] focus-visible:ring-1 focus-visible:ring-[#2563eb] bg-transparent">
                            <div className="inline-flex w-4 h-4 me-1.5">
                              <svg fill="currentColor" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M8.5 7.5V4H7.5V7.5H4V8.5H7.5V12H8.5V8.5H12V7.5H8.5Z"></path></svg>
                            </div>
                            Add Secret File
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              </ul>

              {error && (
                <div className="text-red-500 text-[14px]">{error}</div>
              )}

              <div className="mt-8 flex justify-start">
                <button
                  type="submit"
                  disabled={isDeploying || !name || !branch}
                  className="text-[16px] font-medium bg-[#e5e7eb] dark:bg-[#f0f0f0] text-gray-900 dark:text-[#0d0d0d] hover:bg-[#2563eb] dark:hover:bg-[#2563eb] hover:text-white h-12 py-3 px-8 flex items-center justify-center outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeploying ? 'Deploying...' : `Deploy ${serviceTitle}`}
                </button>
              </div>

            </form>
          </main>
        </div>
      </div>
    </div>
  );
};

export default NewServiceConfigure;
