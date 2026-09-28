import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { GoGitCommit } from 'react-icons/go';
import { BiSolidBolt } from 'react-icons/bi';
import { getProject } from '../../services/projectService';
import { getEnvironments, type DeploymentEnvironment } from '../../services/environmentService';
import { createDeployment, CiGateError } from '../../services/deploymentService';
import { Icon } from '../../components/icons';

const NewServiceConfigure: React.FC = () => {
  const { projectId, serviceType } = useParams<{ projectId: string, serviceType: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const repo = location.state?.repo;

  const [name, setName] = useState(repo?.name || '');
  const [branch, setBranch] = useState(repo?.defaultBranch || 'main');
  const [workflowFile, setWorkflowFile] = useState('deploy.yml');
   const [rootDir, setRootDir] = useState('');
   const [envVars, setEnvVars] = useState([{ key: '', value: '', isHidden: true }]);
  const [envSecrets, setEnvSecrets] = useState([{ key: '', value: '', isHidden: true }]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  
  // Need to fetch current project name to display in the Project dropdown
  const [projectName, setProjectName] = useState('Loading...');
  
  // Branches and Commits
  const [branches, setBranches] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [isFetchingCommits, setIsFetchingCommits] = useState(false);
  const [deployType, setDeployType] = useState<'branch' | 'commit'>('branch');
  const [commit, setCommit] = useState('');
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [commitDropdownOpen, setCommitDropdownOpen] = useState(false);

  // Environments
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState('');
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [isFetchingEnvironments, setIsFetchingEnvironments] = useState(false);

  useEffect(() => {
    if (!repo) {
      navigate(`/projects/${projectId}/services/new/${serviceType}`);
    }
    
    if (!projectId) return;
    // Fetch project name and environments in parallel
    const fetchProject = async () => {
      try {
        const project = await getProject(projectId);
        if (project) {
          setProjectName(project.name);
        } else {
          setProjectName(`Project ${projectId}`);
        }
      } catch (e) {
        setProjectName(`Project ${projectId}`);
      }
    };
    const fetchEnvironments = async () => {
      setIsFetchingEnvironments(true);
      try {
        const envs = await getEnvironments(projectId);
        const active = envs.filter(e => e.isActive);
        setEnvironments(active);
        if (active.length > 0) {
          setSelectedEnvironment(active[0].name);
        }
      } catch (e) {
        console.error('Failed to fetch environments', e);
      } finally {
        setIsFetchingEnvironments(false);
      }
    };
    if (projectId) {
      fetchProject();
      fetchEnvironments();
    }
  }, [repo, navigate, projectId, serviceType]);

  useEffect(() => {
    if (!repo) return;
    const fetchBranches = async () => {
      setIsFetchingBranches(true);
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/githubintegration/repositories/${repo.owner}/${repo.name}/branches`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        if (res.ok) {
          const data = await res.json();
          setBranches(data.data || []);
        }
      } catch (e) {
        console.error('Failed to fetch branches', e);
      } finally {
        setIsFetchingBranches(false);
      }
    };
    fetchBranches();
  }, [repo]);

  useEffect(() => {
    if (!repo || !branch) return;
    const fetchCommits = async () => {
      setIsFetchingCommits(true);
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/githubintegration/repositories/${repo.owner}/${repo.name}/branches/${branch}/commits`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          }
        });
        if (res.ok) {
          const data = await res.json();
          setCommits(data.data || []);
          if (data.data?.length > 0) {
            setCommit(data.data[0].sha);
          }
        }
      } catch (e) {
        console.error('Failed to fetch commits', e);
      } finally {
        setIsFetchingCommits(false);
      }
    };
    fetchCommits();
  }, [repo, branch]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '', isHidden: true }]);
  };
  
  const handleEnvChange = (index: number, field: 'key' | 'value', val: string) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };
  
  const handleToggleEnvVisibility = (index: number) => {
    const newVars = [...envVars];
    newVars[index].isHidden = !newVars[index].isHidden;
    setEnvVars(newVars);
  };
  
  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };
  
  const handleAddEnvSecret = () => {
    setEnvSecrets([...envSecrets, { key: '', value: '', isHidden: true }]);
  };
  
  const handleEnvSecretChange = (index: number, field: 'key' | 'value', val: string) => {
    const newSecrets = [...envSecrets];
    newSecrets[index][field] = val;
    setEnvSecrets(newSecrets);
  };
  
  const handleToggleEnvSecretVisibility = (index: number) => {
    const newSecrets = [...envSecrets];
    newSecrets[index].isHidden = !newSecrets[index].isHidden;
    setEnvSecrets(newSecrets);
  };
  
   const handleRemoveEnvSecret = (index: number) => {
    setEnvSecrets(envSecrets.filter((_, i) => i !== index));
   };

   // Bulk "Add from .env" modal
   const [isEnvFileModalOpen, setIsEnvFileModalOpen] = useState(false);
   const [envFileModalTarget, setEnvFileModalTarget] = useState<'vars' | 'secrets'>('vars');
   const [dotenvValue, setDotenvValue] = useState('');
   const fileInputRef = useRef<HTMLInputElement>(null);

   const openEnvFileModal = (target: 'vars' | 'secrets') => {
    setEnvFileModalTarget(target);
    setDotenvValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsEnvFileModalOpen(true);
   };

   const closeEnvFileModal = () => setIsEnvFileModalOpen(false);

   const parseDotenv = (content: string) => {
    const out: { key: string; value: string; isHidden: boolean }[] = [];
    for (const raw of content.split(/\r?\n/)) {
     const line = raw.trim();
     if (!line || line.startsWith('#')) continue;
     const eq = line.indexOf('=');
     if (eq === -1) continue;
     const key = line.slice(0, eq).trim();
     if (!key) continue;
     let value = line.slice(eq + 1).trim();
     const q = value.charAt(0);
     if ((q === '"' || q === "'") && value.charAt(value.length - 1) === q) {
      value = value.slice(1, -1);
     }
     out.push({ key, value, isHidden: envFileModalTarget === 'secrets' });
    }
    return out;
   };

   const handleAddFromFile = () => {
    const parsed = parseDotenv(dotenvValue);
    if (envFileModalTarget === 'vars') {
     setEnvVars(prev => [...prev, ...parsed]);
    } else {
     setEnvSecrets(prev => [...prev, ...parsed]);
    }
    closeEnvFileModal();
   };

   const handleDotenvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setDotenvValue(text);
   };

   const canSubmitEnvFile = dotenvValue.trim().length > 0;

   const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branch.trim()) {
      setError('Name and Branch are required.');
      return;
    }
    if (!selectedEnvironment) {
      setError('Please select an environment to deploy to.');
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
      // Step 1: Create the service record
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/projects/${projectId}/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          name: name.trim(),
          type: serviceType,
          repositoryUrl: repo.url,
          repositoryName: repo.fullName,
          repositoryBranch: branch.trim(),
          repositoryCommit: deployType === 'commit' ? commit.trim() : undefined,
          isPrivate: repo.isPrivate || false,
          workflowFile: workflowFile.trim() || 'deploy.yml',
          rootDir: rootDir.trim(),
          envVars: envVars.filter(env => env.key.trim() !== ''),
          envSecrets: envSecrets.filter(sec => sec.key.trim() !== '')
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.detail || data?.message || data?.title || 'Failed to create service.');
      }

      const newServiceId = data?.data?.publicId || data?.data?.id;

      // Step 2: Create the deployment record
      const version = deployType === 'commit' && commit
        ? commit.substring(0, 7)
        : branch.trim();

      try {
        await createDeployment({
          serviceId: newServiceId,
          environment: selectedEnvironment,
          version,
          commitSha: deployType === 'commit' ? commit.trim() : undefined,
          branch: deployType === 'branch' ? branch.trim() : undefined,
          overrideCiGate: true, // bypass CI gate on initial service setup
        });
      } catch (deployErr: unknown) {
        if (deployErr instanceof CiGateError) {
          // CI is failing but we override on first deploy — this shouldn't happen with overrideCiGate:true
          console.warn('CI gate warning on initial deploy (overridden):', deployErr.message);
        } else {
          // Deployment record creation failed — service already exists, log and continue
          console.error('Deployment record creation failed:', (deployErr as Error)?.message);
        }
      }

      navigate(`/projects/${projectId}/services/${newServiceId}`);
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
                  <label className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">GitHub Repository</label>
                </div>
              </div>
              <div className="col-span-2 text-gray-600 dark:text-[#c7c7c7]">
                <div className="flex bg-transparent text-gray-900 dark:text-[#f0f0f0] items-center h-14 pl-4 pr-2 py-2 border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">
                  <span className="inline-flex w-7">
                    <Icon name="githubMark" className="flex-shrink-0 text-gray-900 dark:text-[#f0f0f0]" aria-label="GitHub" />
                  </span>
                  <a rel="noopener noreferrer" className="group inline-flex items-center cursor-pointer outline-none text-gray-900 dark:text-white hover:text-[#2563eb] dark:hover:text-[#2563eb] text-[16px] no-underline p-0 transition-colors" target="_blank" href={repo.url}>
                    {repo.owner} <span className="text-[#b3b3b3] px-1">/</span> {repo.name}
                  </a>
                  <span className="hidden md:inline-block">
                    <span role="separator" className="text-[14px] select-none text-[#b3b3b3] mx-2">•</span>
                    <span className="text-[12px] text-[#b3b3b3]">
                      {repo.time ? `${repo.time}` : 'Connected'}
                    </span>
                  </span>
                  <div className="hidden md:inline-block text-nowrap text-right ml-auto">
                    <Link to={`/projects/${projectId}/services/new/${serviceType}`} className="text-[14px] text-gray-600 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-[#f0f0f0] h-8 py-1.5 px-2 outline-none flex items-center group transition-colors rounded-sm">
                      <div className="inline-flex w-4 h-4 me-1.5">
                        <Icon name="editPencil" />
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
                        <input id="serviceName" placeholder="example-service-name" className="h-12 truncate text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] transition-colors" type="text" value={name} onChange={e => setName(e.target.value)} />
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
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-[16px] font-normal tracking-[0.16px] normal-case">Optional</span>
                    </legend>
                  </div>
                  <p className="text-gray-600 dark:text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">
                    Add this {serviceTitle.toLowerCase()} to a <a rel="noopener noreferrer" target="_blank" className="text-[#2563eb] hover:underline" href="#">project</a> once it's created.
                  </p>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-col lg:flex-row w-full gap-y-2 justify-between items-stretch">
                    
                    {/* Project name (read-only) */}
                    <div className="group flex-1 lg:min-w-[10rem] lg:max-w-[60%]">
                      <div className="relative">
                        <button type="button" disabled className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-gray-300 dark:border-[#3a3a3a] rounded-sm appearance-none cursor-not-allowed text-gray-900 dark:text-[#f0f0f0] h-12 text-left flex items-center">
                          <span className="flex flex-1 items-center min-w-0 pr-6">
                            <span className="inline-flex mr-2 text-gray-500 dark:text-[#8f8f8f]">
                              <Icon name="projects" className="w-4 h-4" />
                            </span>
                            <span className="w-full truncate">{projectName}</span>
                          </span>
                          <Icon name="chevronDown" className="absolute top-0 bottom-0 my-auto right-3 text-gray-400" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <span className="hidden lg:flex h-12 shrink-0 items-center">
                      <span aria-hidden="true" className="mx-4 text-[#4d4d4d] text-[16px] select-none">/</span>
                    </span>

                    {/* Environment picker */}
                    <div className="group flex-1 lg:min-w-[10rem] lg:max-w-[60%]">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setEnvDropdownOpen(o => !o)}
                          disabled={isFetchingEnvironments}
                          className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-sm text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] h-12 text-left flex items-center transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <span className="inline-flex mr-2 text-gray-500 dark:text-[#8f8f8f]">
                            {selectedEnvironment?.toLowerCase() === 'production' ? (
                              <BiSolidBolt className="w-4 h-4 text-blue-500" />
                            ) : (
                              <Icon name="environmentBurst" className="w-4 h-4" />
                            )}
                          </span>
                          <span className="flex-1 truncate">
                            {isFetchingEnvironments
                              ? 'Loading…'
                              : environments.length === 0
                                ? 'No environments'
                                : (selectedEnvironment || 'Select environment')}
                          </span>
                          <Icon name="chevronDown" className="ml-2 shrink-0 text-gray-400" aria-hidden="true" />
                        </button>

                        {envDropdownOpen && !isFetchingEnvironments && (
                          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#4d4d4d] rounded-sm shadow-lg max-h-48 overflow-y-auto">
                            {environments.length === 0 ? (
                              <div className="px-4 py-3 text-[14px] text-gray-500 dark:text-[#8f8f8f]">
                                No active environments. <Link to={`/projects/${projectId}/environments`} className="text-[#2563eb] hover:underline" onClick={() => setEnvDropdownOpen(false)}>Create one first.</Link>
                              </div>
                            ) : (
                              environments.map(env => (
                                <button
                                  key={env.id}
                                  type="button"
                                  onClick={() => { setSelectedEnvironment(env.name); setEnvDropdownOpen(false); }}
                                  className={`w-full text-left flex items-center px-3 py-2.5 text-[15px] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] transition-colors ${
                                    selectedEnvironment === env.name
                                      ? 'text-[#2563eb] dark:text-[#60a5fa] bg-blue-50 dark:bg-[#1e2d45]'
                                      : 'text-gray-900 dark:text-[#f0f0f0]'
                                  }`}
                                >
                                  <span className="inline-flex mr-2 text-gray-500 dark:text-[#8f8f8f]">
                                    {env.type?.toLowerCase() === 'production' ? (
                                      <BiSolidBolt className="w-4 h-4 text-blue-500" />
                                    ) : (
                                      <Icon name="environmentBurst" className="w-4 h-4" />
                                    )}
                                  </span>
                                  <span className="truncate">{env.name}</span>
                                  {selectedEnvironment === env.name && (
                                    <Icon name="checkSmall" className="ml-auto w-3.5 h-3.5 shrink-0 text-[#2563eb]" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Branch and Commit Selection */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <label htmlFor="branch" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">Version</label>
                  </div>
                  <div className="text-gray-600 dark:text-[#c7c7c7] text-[16px] leading-[24px] font-normal tracking-[0.16px] normal-case">Select the branch or specific commit to deploy.</div>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-col gap-y-5">

                    {/* Deploy type toggle — custom checkbox style */}
                    <div className="flex gap-x-6">
                      {/* Branch option */}
                      <label className="flex items-center gap-x-3 cursor-pointer group select-none">
                        <span
                          onClick={() => setDeployType('branch')}
                          className="relative flex-shrink-0 w-[20px] h-[20px] rounded-[2px] overflow-hidden cursor-pointer"
                          style={{ boxShadow: '0px 0px 0px 1px #fff' }}
                        >
                          {/* sliding fill */}
                          <span
                            className="absolute w-[40px] h-[40px] bg-white rounded-none"
                            style={{
                              top: deployType === 'branch' ? '-6px' : '-36px',
                              left: deployType === 'branch' ? '-6px' : '-36px',
                              transform: 'rotateZ(45deg)',
                              transition: '300ms ease',
                              zIndex: 100,
                            }}
                          />
                        </span>
                        <span className="flex items-center gap-x-1.5 text-gray-900 dark:text-[#f0f0f0] text-[17px] font-medium">
                          Deploy Branch
                          <Icon name="gitBranch" className="w-4.5 h-4.5 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                        </span>
                      </label>

                      {/* Commit option */}
                      <label className="flex items-center gap-x-3 cursor-pointer group select-none">
                        <span
                          onClick={() => setDeployType('commit')}
                          className="relative flex-shrink-0 w-[20px] h-[20px] rounded-[2px] overflow-hidden cursor-pointer"
                          style={{ boxShadow: '0px 0px 0px 1px #fff' }}
                        >
                          <span
                            className="absolute w-[40px] h-[40px] bg-white rounded-none"
                            style={{
                              top: deployType === 'commit' ? '-6px' : '-36px',
                              left: deployType === 'commit' ? '-6px' : '-36px',
                              transform: 'rotateZ(45deg)',
                              transition: '300ms ease',
                              zIndex: 100,
                            }}
                          />
                        </span>
                        <span className="flex items-center gap-x-1.5 text-gray-900 dark:text-[#f0f0f0] text-[17px] font-medium">
                          Deploy Specific Commit
                          <Icon name="gitCommit" className="w-4.5 h-4.5 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                        </span>
                      </label>
                    </div>

                    {/* Branch — custom dropdown */}
                    <div className="flex flex-col">
                      <label className="text-[16px] font-semibold text-gray-900 dark:text-[#f0f0f0] mb-2">Branch</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setBranchDropdownOpen(o => !o)}
                          disabled={isFetchingBranches}
                          className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-sm text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] h-12 text-left flex items-center transition-colors disabled:opacity-60"
                        >
                          <Icon name="gitBranch" className="w-3.5 h-3.5 mr-2 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                          <span className="flex-1 truncate font-geist-mono">
                            {isFetchingBranches ? 'Loading branches…' : (branch || 'Select a branch')}
                          </span>
                          <Icon name="chevronDown" className="ml-2 shrink-0 text-gray-400" aria-hidden="true" />
                        </button>

                        {branchDropdownOpen && !isFetchingBranches && (
                          <div className="absolute z-50 mt-1 w-full font-geist-mono bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#4d4d4d] rounded-sm shadow-lg max-h-72 overflow-y-auto custom-scrollbar">
                            {branches.length === 0 ? (
                              <div className="px-4 py-3 text-[14px] text-gray-500 dark:text-[#8f8f8f]">No branches found</div>
                            ) : (
                              branches.map((b: any) => (
                                <button
                                  key={b.name}
                                  type="button"
                                  onClick={() => { setBranch(b.name); setBranchDropdownOpen(false); }}
                                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-[15px] font-geist-mono rounded-sm transition-colors ${
                                    branch === b.name
                                      ? 'text-[#2563eb] dark:text-[#60a5fa] bg-blue-50 dark:bg-[#1e2d45]'
                                      : 'text-gray-900 dark:text-[#f0f0f0] hover:bg-gray-100 dark:hover:bg-[#ffffff1a]'
                                  }`}
                                >
                                  <Icon name="gitBranch" className="w-3.5 h-3.5 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                                  <span className="truncate font-geist-mono">{b.name}</span>
                                  {branch === b.name && (
                                    <Icon name="checkSmall" className="ml-auto w-3.5 h-3.5 shrink-0 text-[#2563eb]" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Commit dropdown (shown only in commit mode) */}
                    {deployType === 'commit' && (
                      <div className="flex flex-col">
                        <label className="text-[16px] font-semibold text-gray-900 dark:text-[#f0f0f0] mb-2">Commit</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setCommitDropdownOpen(o => !o)}
                            disabled={isFetchingCommits}
                            className="text-[16px] w-full m-0 py-2.5 px-3 bg-transparent border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-sm text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] h-12 text-left flex items-center transition-colors disabled:opacity-60"
                          >
                            <GoGitCommit className="w-4 h-4 mr-2 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                            <span className="flex-1 truncate font-geist-mono">
                              {isFetchingCommits ? 'Loading commits…' : (commit ? `${commit.substring(0, 7)} · ${commits.find(c => c.sha === commit)?.message?.split('\n')[0] || ''}` : 'Select a commit')}
                            </span>
                            <Icon name="chevronDown" className="ml-2 shrink-0 text-gray-400" aria-hidden="true" />
                          </button>

                          {commitDropdownOpen && !isFetchingCommits && (
                            <div className="absolute z-50 mt-1 w-full font-geist-mono bg-white dark:bg-[oklch(0.21_0.03_263.45)] border border-gray-300 dark:border-[#4d4d4d] rounded-sm shadow-lg max-h-64 overflow-y-auto">
                              {commits.length === 0 ? (
                                <div className="px-4 py-3 text-[14px] text-gray-500 dark:text-[#8f8f8f]">No commits found</div>
                              ) : (
                                commits.map((c: any) => (
                                  <button
                                    key={c.sha}
                                    type="button"
                                    onClick={() => { setCommit(c.sha); setCommitDropdownOpen(false); }}
                                    className={`w-full text-left flex items-center px-3 py-2.5 text-[15px] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] transition-colors ${
                                      commit === c.sha
                                        ? 'text-[#2563eb] dark:text-[#60a5fa] bg-blue-50 dark:bg-[#1e2d45]'
                                        : 'text-gray-900 dark:text-[#f0f0f0]'
                                    }`}
                                  >
                                    <GoGitCommit className="w-4 h-4 mr-2.5 shrink-0 text-gray-500 dark:text-[#8f8f8f]" />
                                    <span className="truncate">{c.sha.substring(0, 7)} · {c.message.split('\n')[0]}</span>
                                    {commit === c.sha && (
                                      <Icon name="checkSmall" className="ml-auto w-3.5 h-3.5 shrink-0 text-[#2563eb]" />
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Root Directory */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div className="col-span-1">
                  <div className="flex items-center">
                    <label htmlFor="rootDir" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold tracking-[0.16px] normal-case">
                      Root Directory
                      <span className="ml-2 text-gray-500 dark:text-gray-400 text-[16px] font-normal tracking-[0.16px] normal-case">Optional</span>
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
                        <input id="rootDir" placeholder="e.g. src" className="h-12 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none focus-visible:border-[#2563eb] border border-solid border-gray-300 dark:border-[#6b6b6b] rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] hover:border-gray-400 dark:hover:border-[#b3b3b3] transition-colors" type="text" value={rootDir} onChange={e => setRootDir(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* GitHub Actions workflow */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-y-4 xl:gap-y-0 xl:gap-x-10">
                <div>
                  <label htmlFor="workflowFile" className="inline-block text-gray-900 dark:text-[#f0f0f0] mb-1 text-[18px] font-semibold">GitHub Actions workflow</label>
                  <p className="text-gray-600 dark:text-[#c7c7c7]">The workflow file in .github/workflows that accepts workflow_dispatch.</p>
                </div>
                <div className="col-span-2">
                  <input id="workflowFile" className="h-12 text-[16px] w-full py-2.5 px-3 bg-transparent font-mono border border-gray-300 dark:border-[#6b6b6b] rounded-sm text-gray-900 dark:text-[#f0f0f0]" value={workflowFile} onChange={e => setWorkflowFile(e.target.value)} placeholder="deploy.yml" />
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <div id="environment-variables" className="p-6 md:p-8 bg-transparent dark:bg-[oklch(0.21_0.03_263.45)] border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm scroll-mt-20">
                  <div className="mb-8">
                    <div className="flex justify-between">
                      <div className="flex-1 small:pr-4">
                        <div className="">
                          <h4 className="text-gray-900 dark:text-white text-[18px] font-semibold font-['Roobert',sans-serif]">Environment Variables</h4>
                        </div>
                        <div className="text-[16px] leading-[24px] text-gray-600 dark:text-[#c7c7c7] mt-1 max-w-xl font-['Neue_Montreal',sans-serif]">
                          Set environment-specific config and secrets (such as API keys), then read those values from your code. 
                          <a rel="noopener noreferrer" target="_blank" className="font-inherit text-[#2563eb] hover:text-[#1d4ed8] active:text-[#1e3a8a] hover:underline relative no-underline outline-none ml-1" href="https://render.com/docs/configure-environment-variables">Learn more.</a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[16px] leading-[24px] text-gray-900 dark:text-[#f0f0f0] font-['Neue_Montreal',sans-serif]">
                    <div className="col-span-2 mt-0">
                      {envVars.length > 0 && (
                        <div className="border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm overflow-hidden">
                          <table className="w-full">
                            <thead className="border-b border-solid border-gray-300 dark:border-[#4d4d4d]">
                            <tr>
                              <th scope="col" className="w-1/3 py-3 pl-7 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]">Key</th>
                              <th scope="col" className="py-3 pl-2 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]">Value</th>
                              <th scope="col" className="w-px pr-4"><span className="sr-only">Delete</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {envVars.map((envVar, idx) => (
                              <tr key={idx}>
                                <td className="w-1/3 p-4 pt-0 align-top [tr:first-of-type_>_&]:pt-4">
                                  <div className="flex flex-col">
                                    <label htmlFor={`env-key-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Key</label>
                                    <div className="flex relative">
                                      <input 
                                        placeholder="NAME_OF_VARIABLE" 
                                        id={`env-key-${idx}`} 
                                        className="h-10 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb]" 
                                        type="text" 
                                        value={envVar.key} 
                                        onChange={(e) => handleEnvChange(idx, 'key', e.target.value)} 
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4">
                                  <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
                                    <div className="flex flex-col w-full">
                                      <label htmlFor={`env-value-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Value</label>
                                      <div className="flex relative">
                                        <input 
                                          type={envVar.isHidden ? "password" : "text"}
                                          name={`envVars.${idx}.value`} 
                                          placeholder="value" 
                                          dir="auto" 
                                          autoComplete="off" 
                                          spellCheck="false" 
                                          id={`env-value-${idx}`} 
                                          className="h-10 font-mono text-[16px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb] min-h-10 py-2"
                                          value={envVar.value}
                                          onChange={(e) => handleEnvChange(idx, 'value', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 justify-start">
                                      <button type="button" aria-label="Toggle secret visibility" onClick={() => handleToggleEnvVisibility(idx)} className="text-[16px] text-gray-600 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-[#f0f0f0] active:bg-gray-200 dark:active:bg-[#fff3] active:text-gray-900 dark:active:text-[#fff] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors">
                                        {envVar.isHidden ? (
                                          <Icon name="eye" />
                                        ) : (
                                          <Icon name="eyeOff" aria-hidden="true" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="w-px pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4">
                                  <button onClick={() => handleRemoveEnvVar(idx)} type="button" aria-label="Delete" className="text-[16px] bg-transparent text-red-500 dark:text-[#f0989e] hover:bg-red-600 hover:text-white dark:hover:bg-[#f4b3b7] dark:hover:text-[#000] active:bg-red-700 dark:active:bg-[#fad1d3] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors">
                                    <Icon name="trash" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                      
                      <div className="flex-wrap mt-5 flex gap-3">
                        <button type="button" onClick={handleAddEnvVar} className="text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-50 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] active:bg-gray-100 dark:active:bg-[#fff] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors rounded-sm">
                          <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>Add Environment Variable
                        </button>
                        <button type="button" onClick={() => openEnvFileModal('vars')} className="text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-50 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] active:bg-gray-100 dark:active:bg-[#fff] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors rounded-sm">
                          <div className="inline-flex w-4 h-4 me-1.5"><Icon name="trashBox" /></div>Add from .env
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Secrets */}
              <div>
                <div id="environment-secrets" className="p-6 md:p-8 bg-transparent dark:bg-[oklch(0.21_0.03_263.45)] border border-solid border-gray-300 dark:border-[#4d4d4d] mt-8 rounded-sm scroll-mt-20">
                  <div className="mb-8">
                    <div className="flex justify-between">
                      <div className="flex-1 small:pr-4">
                        <div className="">
                          <h4 className="text-gray-900 dark:text-white text-[18px] font-semibold font-['Roobert',sans-serif]">Environment Secrets</h4>
                        </div>
                        <div className="text-[16px] leading-[24px] text-gray-600 dark:text-[#c7c7c7] mt-1 max-w-xl font-['Neue_Montreal',sans-serif]">
                          Set sensitive environment variables (such as passwords, tokens, or private keys) securely. These values are encrypted and injected into your app during builds and at runtime.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-[16px] leading-[24px] text-gray-900 dark:text-[#f0f0f0] font-['Neue_Montreal',sans-serif]">
                    <div className="col-span-2 mt-0">
                      {envSecrets.length > 0 && (
                        <div className="border border-solid border-gray-300 dark:border-[#4d4d4d] rounded-sm overflow-hidden">
                          <table className="w-full">
                            <thead className="border-b border-solid border-gray-300 dark:border-[#4d4d4d]">
                            <tr>
                              <th scope="col" className="w-1/3 py-3 pl-7 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]">Key</th>
                              <th scope="col" className="py-3 pl-2 pr-4 text-left font-mono text-[16px] uppercase text-gray-900 dark:text-[#f0f0f0]">Value</th>
                              <th scope="col" className="w-px pr-4"><span className="sr-only">Delete</span></th>
                            </tr>
                          </thead>
                          <tbody>
                            {envSecrets.map((envSecret, idx) => (
                              <tr key={idx}>
                                <td className="w-1/3 p-4 pt-0 align-top [tr:first-of-type_>_&]:pt-4">
                                  <div className="flex flex-col">
                                    <label htmlFor={`env-secret-key-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Key</label>
                                    <div className="flex relative">
                                      <input 
                                        placeholder="NAME_OF_SECRET" 
                                        id={`env-secret-key-${idx}`} 
                                        className="h-10 truncate font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb]" 
                                        type="text" 
                                        value={envSecret.key} 
                                        onChange={(e) => handleEnvSecretChange(idx, 'key', e.target.value)} 
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4">
                                  <div className="w-full flex items-start space-x-4 scroll-mt-16 scroll-mb-2">
                                    <div className="flex flex-col w-full">
                                      <label htmlFor={`env-secret-value-${idx}`} className="inline-block text-[12px] font-medium text-[#f0f0f0] mb-2 sr-only">Value</label>
                                      <div className="flex relative">
                                        <input 
                                          type={envSecret.isHidden ? "password" : "text"}
                                          name={`envSecrets.${idx}.value`} 
                                          placeholder="value" 
                                          dir="auto" 
                                          autoComplete="off" 
                                          spellCheck="false" 
                                          id={`env-secret-value-${idx}`} 
                                          className="h-10 font-mono text-[16px] w-full m-0 px-3 bg-transparent placeholder-gray-400 dark:placeholder-[#8f8f8f] outline-none border border-solid rounded-sm appearance-none text-gray-900 dark:text-[#f0f0f0] border-gray-300 dark:border-[#6b6b6b] focus:border-[#2563eb] min-h-10 py-2"
                                          value={envSecret.value}
                                          onChange={(e) => handleEnvSecretChange(idx, 'value', e.target.value)}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 justify-start">
                                      <button type="button" aria-label="Toggle secret visibility" onClick={() => handleToggleEnvSecretVisibility(idx)} className="text-[16px] text-gray-600 dark:text-[#e3e3e3] hover:bg-gray-100 dark:hover:bg-[#ffffff1a] hover:text-gray-900 dark:hover:text-[#f0f0f0] active:bg-gray-200 dark:active:bg-[#fff3] active:text-gray-900 dark:active:text-[#fff] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors">
                                        {envSecret.isHidden ? (
                                          <Icon name="eye" />
                                        ) : (
                                          <Icon name="eyeOff" aria-hidden="true" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                <td className="w-px pb-4 pr-4 align-top [tr:first-of-type_>_&]:pt-4">
                                  <button onClick={() => handleRemoveEnvSecret(idx)} type="button" aria-label="Delete" className="text-[16px] bg-transparent text-red-500 dark:text-[#f0989e] hover:bg-red-600 hover:text-white dark:hover:bg-[#f4b3b7] dark:hover:text-[#000] active:bg-red-700 dark:active:bg-[#fad1d3] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors">
                                    <Icon name="trash" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      )}
                      
                      <div className="flex-wrap mt-5 flex gap-3">
                        <button type="button" onClick={handleAddEnvSecret} className="text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-50 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] active:bg-gray-100 dark:active:bg-[#fff] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors rounded-sm">
                          <div className="inline-flex w-4 h-4 me-1.5"><Icon name="plus" /></div>Add Secret
                        </button>
                        <button type="button" onClick={() => openEnvFileModal('secrets')} className="text-[16px] text-gray-700 dark:text-[#e3e3e3] hover:bg-gray-50 dark:hover:bg-[#ffffffe6] hover:text-gray-900 dark:hover:text-[oklch(0.21_0.03_263.45)] active:bg-gray-100 dark:active:bg-[#fff] border border-solid border-gray-300 dark:border-[#fff6] h-10 py-2.5 px-3 outline-none flex items-center group/button transition-colors rounded-sm">
                          <div className="inline-flex w-4 h-4 me-1.5">
                            <Icon name="plus" />
                          </div>
                          Add Secret File
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-[14px]">{error}</div>
              )}

              <div className="mt-8 flex justify-start">
                <button
                  type="submit"
                  disabled={isDeploying || !name || !branch}
                  className="text-[16px] font-medium bg-[#e5e7eb] dark:bg-[#f0f0f0] text-gray-900 dark:text-[oklch(0.21_0.03_263.45)] hover:bg-[#2563eb] dark:hover:bg-[#2563eb] hover:text-white h-12 py-3 px-8 flex items-center justify-center outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
                >
                  {isDeploying ? 'Deploying...' : `Deploy ${serviceTitle}`}
                </button>
              </div>

              </form>

              {/* Add from .env modal */}
              {isEnvFileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={closeEnvFileModal}>
                  <div  className="inline-block w-full my-8 text-left align-middle transform bg-white dark:bg-[oklch(0.21_0.03_263.45)] shadow-lg border border-solid border-[#4d4d4d] rounded-sm max-w-xl"
 onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col gap-2 items-start border-solid border-b border-[#4d4d4d] p-6">
                      <div className="w-full">
                        <h1 className="text-[18px] font-semibold text-[#f0f0f0]">{envFileModalTarget === 'vars' ? 'Add environment variables from .env' : 'Add secrets from .env'}</h1>
                        <div className="text-[14px] text-[#c7c7c7] mt-1 max-w-xl">
                          {envFileModalTarget === 'vars' ? 'Paste your .env contents to add multiple environment variables at once. Read the' : 'Paste your .env contents to add multiple secrets at once. Sensitive values are encrypted and stored securely. Read the'}{' '}
                          <a rel="noopener noreferrer" target="_blank" className="font-inherit text-[#2563eb] hover:text-[#1d4ed8] hover:underline" href="https://render.com/docs/configure-environment-variables#adding-in-bulk-from-a-env-file">
                            docs
                          </a>{' '}
                          for correct syntax.
                        </div>
                      </div>
                      <button type="button" aria-label="Close modal" onClick={closeEnvFileModal} className="flex p-0 w-4 h-4 before:absolute before:content-[''] before:-inset-2 absolute right-3 top-3 text-[#e3e3e3] hover:text-[#f0f0f0]">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>

                    <form
                      onSubmit={e => { e.preventDefault(); if (canSubmitEnvFile) handleAddFromFile(); }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          if (canSubmitEnvFile) handleAddFromFile();
                        }
                      }}
                    >
                      <div className="text-[14px] text-[#f0f0f0] p-6">
                        <label htmlFor="dotenv" className="sr-only">.env</label>
                        <div className="flex gap-2 flex-col">
                          <div className="flex flex-col w-full">
                            <div className="flex relative">
                              <textarea
                                rows={6}
                                id="dotenv"
                                name="dotenv"
                                spellCheck={false}
                                autoComplete="off"
                                placeholder="KEY_1=VALUE_1
KEY_2=VALUE_2
KEY_3=VALUE_3"
                                value={dotenvValue}
                                onChange={e => setDotenvValue(e.target.value)}
                                className="font-mono text-[16px] w-full m-0 py-2.5 px-3 bg-[#141414] placeholder-[#8f8f8f] text-[#f0f0f0] border border-solid border-[#6b6b6b] hover:border-[#b3b3b3] rounded-sm appearance-none resize-none outline-none focus:border-[#2563eb]"
                              />
                            </div>
                          </div>
                          <input ref={fileInputRef} type="file" accept="" hidden onChange={handleDotenvFileChange} />
                          <div className="flex flex-row justify-end">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-[#2563eb] hover:bg-[#1d4ed8] text-[#fff] flex items-center group/button text-sm font-medium h-8 py-1.5 px-2">
                              Choose a file
                              <span className="inline-flex w-4 h-4 ms-1.5">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 9L3.705 9.705L7.5 5.915V15H8.5V5.915L12.295 9.705L13 9L8 4L3 9Z" fill="currentColor" />
                                  <path d="M3 4V2H13V4H14V2C14 1.73478 13.8946 1.48043 13.7071 1.29289C13.5196 1.10536 13.2652 1 13 1H3C2.73478 1 2.48043 1.10536 2.29289 1.29289C2.10536 1.48043 2 1.73478 2 2V4H3Z" fill="currentColor" />
                                </svg>
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="w-full flex justify-start space-x-2 p-6 border-solid border-t border-[#4d4d4d]">
                        <button
                          type="submit"
                          disabled={!canSubmitEnvFile}
                          aria-keyshortcuts="Control+Enter"
                          className="text-sm font-medium h-10 py-2.5 px-3 flex items-center group/button bg-[#fff] hover:bg-[#2563eb] text-[#000] hover:text-[#fff] disabled:text-[#4d4d4d] disabled:bg-[#272727] disabled:border-[#4d4d4d] border border-solid border-transparent rounded-sm"
                        >
                          Add {envFileModalTarget === 'vars' ? 'variables' : 'secrets'}
                          <kbd className="inline-flex items-center space-x-1 px-1 py-0.5 h-5 w-fit font-mono text-[10px] border border-[#0000001a] rounded-[3px] ms-2 bg-[#0000000a] text-[#1a1a1a] group-hover/button:border-[#ffffff2a] group-hover/button:bg-[#ffffff1a] group-hover/button:text-[#e3e3e3] disabled:text-[#e3e3e3] disabled:bg-[#ffffff1a] disabled:border-[#fff6]">
                            <svg aria-hidden="true" width="7" height="4" viewBox="0 0 7 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path fill="currentColor" d="M0.564 3.72L3.132 0.42H4.08L6.636 3.72H5.568L3.612 1.296H3.588L1.644 3.72H0.564Z" />
                            </svg>
                            <span className="sr-only">Ctrl</span>
                            <span className="sr-only">+</span>
                            <svg aria-hidden="true" width="10" height="10" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="m22,8v2c2.2061,0,4,1.7944,4,4s-1.7939,4-4,4h-12v-5l-6,6,6,6v-5h12c3.3086,0,6-2.6914,6-6s-2.6914-6-6-6Z" />
                            </svg>
                            <span className="sr-only">Enter</span>
                          </kbd>
                        </button>
                        <button
                          type="button"
                          onClick={closeEnvFileModal}
                          className="border border-solid border-[#fff6] hover:bg-[#ffffff1a] hover:text-[#f0f0f0] text-[#e3e3e3] h-10 py-2.5 px-3 outline-none flex items-center group/button text-sm font-medium rounded-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    );
};

export default NewServiceConfigure;
