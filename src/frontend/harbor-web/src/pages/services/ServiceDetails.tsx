import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { FaGithub } from 'react-icons/fa';
import { MdFiberNew } from 'react-icons/md';
import { BiSolidBolt } from 'react-icons/bi';

import ServiceDeploys from './ServiceDeploys';
import ServiceLogs from './ServiceLogs';
import DeploymentDetails from './DeploymentDetails';
import ServiceMetrics from './ServiceMetrics';
import ServiceEnvironment from './ServiceEnvironment';
import ServiceSettings from './ServiceSettings';
import ServiceCiRuns from './ServiceCiRuns';
import { createDeployment, CiGateError } from '../../services/deploymentService';
import { getEnvironments, type DeploymentEnvironment } from '../../services/environmentService';

// ─── Deploy Modal ────────────────────────────────────────────────────────────
interface DeployModalProps {
  service: any;
  projectId: string;
  onClose: () => void;
  onDeployed: () => void;
  mode?: 'latest' | 'specific';
  latestCommitSha?: string;
}

export function DeployModal({ service, projectId, onClose, onDeployed, mode = 'latest', latestCommitSha }: DeployModalProps) {
  const [environments, setEnvironments] = useState<DeploymentEnvironment[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('');
  const [envDropdownOpen, setEnvDropdownOpen] = useState(false);
  const [branch, setBranch] = useState(mode === 'specific' ? '' : (service?.repositoryBranch || 'main'));
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ciWarning, setCiWarning] = useState<string | null>(null);
  const [actualLatestCommit, setActualLatestCommit] = useState<{sha: string, message: string} | null>(null);
  const [commitsList, setCommitsList] = useState<{sha: string, message: string}[]>([]);
  const [commitDropdownOpen, setCommitDropdownOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (service?.repositoryName) {
      const fetchCommits = async () => {
        try {
          const [owner, repo] = service.repositoryName.split('/');
          const targetBranch = service?.repositoryBranch || 'main';
          const token = localStorage.getItem('harbor_token');
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
          const res = await fetch(`${apiBaseUrl}/projects/githubintegration/repositories/${owner}/${repo}/branches/${targetBranch}/commits`, {
             headers: { 
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'application/json',
               'ngrok-skip-browser-warning': 'true'
             }
          });
          if (res.ok) {
             const data = await res.json();
             if (data.data && Array.isArray(data.data)) {
                setCommitsList(data.data);
                if (data.data.length > 0) {
                   setActualLatestCommit({ sha: data.data[0].sha, message: data.data[0].message });
                }
             }
          }
        } catch (e) {
          console.error('Failed to fetch commits', e);
        }
      };
      fetchCommits();
    }
  }, [service]);


  useEffect(() => {
    getEnvironments(projectId)
      .then((envs) => {
        const active = envs.filter((e) => e.isActive);
        setEnvironments(active);
        if (active.length > 0) setSelectedEnv(active[0].name);
      })
      .catch(() => setError('Could not load environments.'));
  }, [projectId]);

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDeploy = async (overrideCiGate = false) => {
    if (!selectedEnv || !branch.trim()) {
      setError('Please select an environment and specify a branch or commit.');
      return;
    }
    setDeploying(true);
    setError('');
    setCiWarning(null);
    try {
      const isLatest = mode === 'latest';
      const cSha = isLatest ? actualLatestCommit?.sha : branch.trim();
      const cMsg = isLatest 
        ? actualLatestCommit?.message 
        : commitsList.find(c => c.sha === branch.trim())?.message;

      const result = await createDeployment({
        serviceId: service.publicId || service.id.toString(),
        environment: selectedEnv,
        version: isLatest ? service?.repositoryBranch || 'main' : cSha,
        branch: service?.repositoryBranch || 'main',
        commitSha: cSha,
        commitMessage: cMsg,
        overrideCiGate,
      });
      // 502-equivalent: deployment record created but GitHub rejected the trigger
      if (result.status === 'Failed') {
        const triggerErr = (result as any).failureReason || 'GitHub rejected the workflow trigger.';
        setError(`Deployment created but GitHub could not start the workflow: ${triggerErr}`);
        setTimeout(() => onDeployed(), 500);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        onDeployed();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof CiGateError) {
        // CI gate blocked — show warning with "Deploy anyway?" option
        setCiWarning(err.message);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="inline-block w-full text-left align-middle transform bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] max-w-lg rounded-sm">
        {/* Header */}
        <div className="flex flex-col gap-2 items-start border-b border-[#4d4d4d] p-6 relative">
          <div className="w-full pr-8 flex items-center gap-3">
            {mode === 'latest' ? (
              <MdFiberNew className="w-7 h-7 text-white" />
            ) : (
              <svg viewBox="0 0 16 16" height="24" width="24" data-slot="geist-icon" className="flex-none text-white" style={{ color: 'currentColor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
            )}
            <h1 className="text-[24px] font-medium text-white">{mode === 'latest' ? 'Deploy latest commit' : 'Deploy a specific commit'}</h1>
          </div>
          <button 
            className="flex p-1.5 text-[#e3e3e3] hover:text-white hover:bg-[#ffffff1a] transition-colors rounded-sm absolute right-4 top-4" 
            type="button" 
            aria-label="Close modal"
            onClick={onClose}
          >
            <svg fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.7L11.3 4L8 7.3L4.7 4L4 4.7L7.3 8L4 11.3L4.7 12L8 8.7L11.3 12L12 11.3L8.7 8L12 4.7Z"></path>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="text-[16px] text-[#f0f0f0] p-6 space-y-6">
          {/* Service info */}
          <div className="flex items-center gap-2 p-3 bg-transparent border border-[#6b6b6b] rounded-sm">
            <div className="w-8 h-8 rounded-sm bg-transparent border border-[#6b6b6b] flex items-center justify-center flex-shrink-0 text-white">
              <svg fill="currentColor" aria-hidden="true" className="flex-shrink-0 w-5 h-5" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.65 2.45L8.4 1.1C8.25 1.05 8.15 1 8 1C7.85 1 7.75 1.05 7.65 1.1L5.4 2.45C5.15 2.6 5 2.85 5 3.1V5.9C5 6.15 5.15 6.4 5.35 6.55L7.6 7.9C7.7 7.95 7.85 8 7.95 8C8.05 8 8.2 7.95 8.3 7.9L10.55 6.55C10.75 6.4 10.9 6.2 10.9 5.9V3.1C11 2.85 10.85 2.6 10.65 2.45ZM10 5.75L8 6.95L6 5.75V3.25L8 2.05L10 3.25V5.75Z"></path><path d="M14.65 9.45L12.4 8.1C12.25 8.05 12.15 8 12 8C11.85 8 11.75 8.05 11.65 8.1L9.4 9.45C9.2 9.6 9.05 9.8 9.05 10.1V12.9C9.05 13.15 9.2 13.4 9.4 13.55L11.65 14.9C11.75 14.95 11.9 15 12 15C12.1 15 12.25 14.95 12.35 14.9L14.6 13.55C14.8 13.4 14.95 13.2 14.95 12.9V10.1C15 9.85 14.85 9.6 14.65 9.45ZM14 12.75L12 13.95L10 12.75V10.25L12 9.05L14 10.25V12.75Z"></path><path d="M6.65 9.45L4.4 8.1C4.25 8.05 4.15 8 4 8C3.85 8 3.75 8.05 3.65 8.1L1.4 9.45C1.15 9.6 1 9.85 1 10.1V12.9C1 13.15 1.15 13.4 1.35 13.55L3.6 14.9C3.75 14.95 3.85 15 4 15C4.15 15 4.25 14.95 4.35 14.9L6.6 13.55C6.8 13.4 6.95 13.2 6.95 12.9V10.1C7 9.85 6.85 9.6 6.65 9.45ZM6 12.75L4 13.95L2 12.75V10.25L4 9.05L6 10.25V12.75Z"></path>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-white truncate">{service?.name}</div>
              {service?.repositoryName && (
                <div className="text-[13px] text-[#8f8f8f] flex items-center gap-1 truncate">
                  <FaGithub className="w-3.5 h-3.5 flex-shrink-0" />
                  {service.repositoryName}
                </div>
              )}
            </div>
          </div>

          {/* Environment selector */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Environment
            </label>
            {environments.length === 0 && !error ? (
              <div className="h-10 flex items-center px-3 bg-transparent border border-[#6b6b6b] rounded-sm text-[15px] text-[#8f8f8f]">
                Loading environments…
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setEnvDropdownOpen(!envDropdownOpen)}
                  className="h-10 w-full flex items-center justify-between px-3 bg-transparent border border-[#6b6b6b] hover:border-[#b3b3b3] focus:border-[#2563eb] text-[#f0f0f0] transition-colors rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selEnvObj = environments.find(e => e.name === selectedEnv);
                      const type = selEnvObj ? selEnvObj.type.toLowerCase() : '';
                      if (type === 'production') return <BiSolidBolt className="w-4 h-4 shrink-0 text-[#f0f0f0]" />;
                      return <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 shrink-0 text-[#f0f0f0]" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>;
                    })()}
                    <span>{selectedEnv || 'Select environment'}</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#8f8f8f]" />
                </button>

                {envDropdownOpen && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] rounded-sm z-[100] shadow-xl max-h-60 overflow-y-auto">
                    {environments.map(env => {
                      const type = env.type.toLowerCase();
                      const isProduction = type === 'production';
                      return (
                        <li 
                          key={env.id}
                          onClick={() => { setSelectedEnv(env.name); setEnvDropdownOpen(false); }} 
                          className="px-3 py-2 hover:bg-[#ffffff1a] cursor-pointer flex items-center gap-2 text-[#f0f0f0] transition-colors"
                        >
                          {isProduction ? (
                            <BiSolidBolt className="w-4 h-4 shrink-0 text-[#f0f0f0]" />
                          ) : (
                            <svg fill="currentColor" aria-hidden="true" className="w-4 h-4 shrink-0 text-[#f0f0f0]" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M5.72573 2.18206L4.21915 3.07246L4.72795 3.93336L6.23453 3.04296L5.72573 2.18206Z"></path><path d="M3 6H2V4.95C2 4.6 2.2 4.25 2.5 4.1L3.25 3.65L3.75 4.5L3 4.95V6Z"></path><path d="M3 7H2V9H3V7Z"></path><path d="M3.25 12.35L2.5 11.9C2.2 11.7 2 11.4 2 11.05V10H3V11.05L3.75 11.5L3.25 12.35Z"></path><path d="M4.72447 12.0523L4.21577 12.9132L5.72235 13.8034L6.23105 12.9425L4.72447 12.0523Z"></path><path d="M8.75 13.55L8 14L7.25 13.55L6.75 14.4L7.5 14.85C7.65 14.95 7.85 15 8 15C8.2 15 8.35 14.95 8.5 14.85L9.25 14.4L8.75 13.55Z"></path><path d="M11.2676 12.063L9.76107 12.9534L10.2699 13.8143L11.7764 12.9239L11.2676 12.063Z"></path><path d="M12.6 12.45L12.1 11.6L13 11.1V10H14V11.05C14 11.4 13.8 11.75 13.5 11.9L12.6 12.45Z"></path><path d="M14 7H13V9H14V7Z"></path><path d="M14 6H13V4.95L12.1 4.45L12.6 3.6L13.5 4.1C13.8 4.3 14 4.6 14 4.95V6Z"></path><path d="M10.2343 2.15943L9.72561 3.02033L11.2322 3.91055L11.7409 3.04965L10.2343 2.15943Z"></path><path d="M8.75 2.45L8 2L7.25 2.45L6.75 1.6L7.5 1.15C7.65 1.05 7.8 1 8 1C8.2 1 8.35 1.05 8.5 1.15L9.25 1.6L8.75 2.45Z"></path></svg>
                          )}
                          {env.name}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Branch */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Branch
            </label>
            <div className="relative flex">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="text-[#8f8f8f]" style={{ color: 'currentColor' }}><path fill="currentColor" fillRule="evenodd" d="M4.75 1.75V1h-1.5v8.09a3 3 0 1 0 3.67 3.6 6.75 6.75 0 0 0 5.77-5.77 3 3 0 1 0-1.52-.03 5.25 5.25 0 0 1-4.28 4.28A3 3 0 0 0 4.75 9.1zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3" clipRule="evenodd"></path></svg>
              </div>
              <input
                type="text"
                value={service?.repositoryBranch || 'main'}
                disabled
                className="h-10 truncate w-full m-0 py-2.5 pl-9 pr-3 bg-[#111111] border border-[#4d4d4d] outline-none text-[#8f8f8f] text-[16px] transition-colors rounded-sm font-mono cursor-not-allowed opacity-70"
              />
            </div>
          </div>

          {/* Commit SHA */}
          <div className="flex flex-col">
            <label className="inline-block text-[15px] font-medium text-[#f0f0f0] mb-2">
              Commit
            </label>
            <div className="relative flex">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="text-[#8f8f8f]" style={{ color: 'currentColor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
              </div>
              <input
                type="text"
                value={mode === 'latest' ? (
                  actualLatestCommit 
                    ? `${actualLatestCommit.message.split('\n')[0]} (${actualLatestCommit.sha.substring(0, 7)})` 
                    : (latestCommitSha || service?.repositoryCommit ? `Latest commit (${(latestCommitSha || service?.repositoryCommit || '').substring(0, 7)})` : 'Latest commit')
                ) : branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setCommitDropdownOpen(true);
                }}
                onFocus={() => mode === 'specific' && setCommitDropdownOpen(true)}
                disabled={mode === 'latest'}
                placeholder={mode === 'latest' ? 'Latest commit' : "e.g. a40f3c2"}
                className="h-10 truncate w-full m-0 py-2.5 pl-9 pr-3 bg-transparent border border-[#6b6b6b] hover:border-[#b3b3b3] focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] outline-none text-[#f0f0f0] text-[16px] placeholder:text-[#8f8f8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded-sm font-mono"
              />
              {mode === 'specific' && commitDropdownOpen && commitsList.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.21_0.03_263.45)] border border-[#4d4d4d] rounded-sm z-[100] shadow-xl max-h-60 overflow-y-auto">
                  {commitsList
                    .filter(c => c.sha.startsWith(branch) || c.message.toLowerCase().includes(branch.toLowerCase()))
                    .map(commit => (
                    <li 
                      key={commit.sha}
                      onClick={() => { setBranch(commit.sha); setCommitDropdownOpen(false); }} 
                      className="px-3 py-2 hover:bg-[#ffffff1a] cursor-pointer flex items-center gap-2 text-[#f0f0f0] transition-colors border-b border-[#4d4d4d]/50 last:border-0"
                    >
                      <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" className="text-[#8f8f8f] shrink-0" style={{ color: 'currentColor' }}><path fill="currentColor" fillRule="evenodd" d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12a4 4 0 0 0 3.93-3.25H16v-1.5h-4.07a4 4 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12" clipRule="evenodd"></path></svg>
                      <div className="flex flex-col gap-0.5 truncate overflow-hidden w-full font-geist-mono">
                        <span className="text-[14px] truncate">{commit.message.split('\n')[0]}</span>
                        <span className="text-[12px] text-[#8f8f8f]">{commit.sha.substring(0, 7)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 text-[13px] text-[#8f8f8f]">
              {mode === 'latest' 
                ? 'Deploying the latest commit from this branch.' 
                : 'GitHub Actions will check out this specific ref when running the workflow.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/50 rounded-sm text-[15px] text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* CI Gate Warning */}
          {ciWarning && (
            <div className="p-4 bg-amber-950/40 border border-amber-700/50 rounded-sm text-[15px] text-amber-300 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200 mb-1">CI checks are failing</div>
                  <div className="text-[14px] text-amber-400">{ciWarning}</div>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-2">
                <button
                  onClick={() => setCiWarning(null)}
                  className="h-9 px-4 text-[14px] text-amber-400 hover:text-amber-200 border border-amber-700/50 hover:bg-amber-900/30 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeploy(true)}
                  disabled={deploying}
                  className="h-9 px-4 text-[14px] font-medium bg-amber-700 hover:bg-amber-600 text-white rounded-sm transition-colors"
                >
                  Deploy anyway
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-700/50 rounded-sm text-[15px] text-emerald-400">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span>Deployment triggered successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="w-full flex justify-start space-x-3 p-6 border-t border-[#4d4d4d] bg-[oklch(0.21_0.03_263.45)]">
          <button
            onClick={() => handleDeploy(false)}
            disabled={deploying || success || environments.length === 0}
            className="h-10 py-2.5 px-4 bg-white text-black hover:bg-[#2563eb] hover:text-white disabled:bg-[#272727] disabled:text-[#4d4d4d] disabled:cursor-not-allowed font-medium text-[15px] transition-colors flex items-center gap-2 rounded-sm"
          >
            {deploying ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Triggering...
              </>
            ) : success ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Triggered!
              </>
            ) : (
              <>
                Deploy
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="h-10 py-2.5 px-4 border border-[#fff6] text-[#e3e3e3] hover:bg-[#ffffff1a] hover:text-white disabled:opacity-50 font-medium text-[15px] transition-colors flex items-center rounded-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Service Layout ───────────────────────────────────────────────────────────
function ServiceLayout() {
  const { projectId, serviceId } = useParams();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const deployRefreshKey = 0;

  useEffect(() => {
    const fetchService = async () => {
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiBase}/projects/${projectId}/services/${serviceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
          },
        });
        if (res.ok) {
          const json = await res.json();
          setService(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch service:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchService();
  }, [projectId, serviceId]);




  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading service...</div>;
  }

  if (!service) {
    return <div className="p-12 text-center text-red-500">Service not found.</div>;
  }

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <Outlet context={{ service, deployRefreshKey }} />
    </div>
  );
}

export default function ServiceDetails() {
  return (
    <Routes>
      <Route element={<ServiceLayout />}>
        <Route index element={<Navigate to="deploys" replace />} />
         <Route path="deployments/:deploymentId" element={<DeploymentDetails />} />
         <Route path="deploys" element={<ServiceDeploys />} />
         <Route path="ci-history" element={<ServiceCiRuns />} />
         <Route path="logs" element={<ServiceLogs />} />
        <Route path="metrics" element={<ServiceMetrics />} />
        <Route path="environment" element={<ServiceEnvironment />} />
        <Route path="settings" element={<ServiceSettings />} />
      </Route>
    </Routes>
  );
}
