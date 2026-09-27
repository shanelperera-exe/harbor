import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Search, Copy, Check, Clock } from 'lucide-react';
import type { DeploymentDetails, DeploymentLog } from '../../services/deploymentService';

interface DeploymentLogsProps {
  deployment: DeploymentDetails;
  service?: any;
}

interface LogStep {
  id: string;
  name: string;
  duration: string;
  status: 'success' | 'failed' | 'running' | 'skipped';
  lines: Array<{
    lineNumber: number;
    text: string;
    isHeader?: boolean;
    timestamp?: string;
    groupId?: string;
  }>;
}

export function DeploymentLogs({ deployment }: DeploymentLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);



  const isFailed = deployment.status?.toLowerCase() === 'failed';
  const failureMessage = deployment.failureReason || deployment.triggerError || 'Build process encountered an unexpected error.';

  // Build dynamic job steps from actual deployment logs
  const steps: LogStep[] = useMemo(() => {
    const backendLogs: DeploymentLog[] = deployment.logs || [];

    if (backendLogs.length > 0) {
      const parsedSteps: LogStep[] = [];
      let currentStep: LogStep | null = null;
      let lineCounter = 1;
      
      let currentGroupId: string | undefined = undefined;
      let groupCounter = 0;

      for (let i = 0; i < backendLogs.length; i++) {
        const logLine = backendLogs[i].message || '';
        
        // Check for job step header like "=== 1_build.txt ==="
        const headerMatch = logLine.match(/^===\s*(.*\.txt)\s*===$/);
        
        if (headerMatch) {
          if (currentStep) {
            parsedSteps.push(currentStep);
          }
          
          let stepName = headerMatch[1];
          // Clean up the filename (e.g., "1_setup.txt" -> "setup")
          const nameMatch = stepName.match(/^\d+_(.*?)\.txt$/);
          if (nameMatch) {
            stepName = nameMatch[1];
          } else {
            stepName = stepName.replace('.txt', '');
          }
          
          // Prettify step name: replace dashes/underscores with spaces and capitalize
          stepName = stepName.replace(/[-_]/g, ' ');
          stepName = stepName.charAt(0).toUpperCase() + stepName.slice(1);

          currentStep = {
            id: `step-${i}`,
            name: stepName,
            duration: '0s', 
            status: 'success', 
            lines: []
          };
          lineCounter = 1;
          currentGroupId = undefined;
          continue;
        }

        if (!currentStep) {
          currentStep = {
            id: 'init',
            name: 'Initialize Job',
            duration: '0s',
            status: 'success',
            lines: []
          };
        }

        let cleanText = logLine;
        let lineTimestamp = backendLogs[i].timestamp;
        
        // Extract timestamp from GitHub Actions log line
        const ghTimestampMatch = logLine.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)/);
        if (ghTimestampMatch) {
          lineTimestamp = ghTimestampMatch[1];
          cleanText = ghTimestampMatch[2];
        }

        let isHeader = false;
        let myGroupId: string | undefined = currentGroupId;

        if (cleanText.startsWith('##[group]')) {
           isHeader = true;
           cleanText = cleanText.substring(9);
           groupCounter++;
           myGroupId = `group-${currentStep.id}-${groupCounter}`;
           currentGroupId = myGroupId;
        } else if (cleanText.startsWith('##[endgroup]')) {
           currentGroupId = undefined;
           continue; // Skip the endgroup line itself
        }

        if (cleanText.includes('##[error]')) {
           currentStep.status = 'failed';
        }

        currentStep.lines.push({
          lineNumber: lineCounter++,
          text: cleanText,
          timestamp: lineTimestamp,
          isHeader,
          groupId: myGroupId
        });
      }

      if (currentStep) {
        parsedSteps.push(currentStep);
      }
      
      // Calculate duration based on timestamps if available
      for (const step of parsedSteps) {
        if (step.lines.length > 0) {
          const firstTs = step.lines[0].timestamp;
          const lastTs = step.lines[step.lines.length - 1].timestamp;
          if (firstTs && lastTs) {
            const start = new Date(firstTs).getTime();
            const end = new Date(lastTs).getTime();
            if (!isNaN(start) && !isNaN(end) && end >= start) {
              const diffMs = end - start;
              if (diffMs < 1000) {
                step.duration = '0s';
              } else if (diffMs < 60000) {
                step.duration = `${Math.floor(diffMs / 1000)}s`;
              } else {
                const mins = Math.floor(diffMs / 60000);
                const secs = Math.floor((diffMs % 60000) / 1000);
                step.duration = `${mins}m ${secs}s`;
              }
            }
          }
        }
      }

      return parsedSteps;
    }

    // Fallback if no logs
    const isRunning = deployment.status?.toLowerCase() === 'running' || deployment.status?.toLowerCase() === 'pending' || deployment.status?.toLowerCase() === 'in_progress';
    
    return [
      {
        id: 'status',
        name: isRunning ? 'Deployment is running...' : 'No logs available',
        duration: '0s',
        status: isRunning ? 'running' : (isFailed ? 'failed' : 'success'),
        lines: [
          { 
            lineNumber: 1, 
            text: isRunning 
              ? "Logs are not yet available. Waiting for GitHub Actions to complete..."
              : (isFailed ? `Deployment failed: ${failureMessage}` : "No logs were captured for this deployment.")
          }
        ]
      }
    ];
  }, [deployment, isFailed, failureMessage]);

  // Track expanded state for each step. By default, first 2 steps + failed step are expanded
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      'setup-job': true,
      'checkout': true
    };
    if (isFailed) {
      initial['build'] = true;
    }
    return initial;
  });

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const expandAll = () => {
    const allSteps: Record<string, boolean> = {};
    const allGroups: Record<string, boolean> = {};
    
    steps.forEach(s => { 
      allSteps[s.id] = true; 
      s.lines.forEach(l => {
        if (l.groupId && l.isHeader) {
          allGroups[l.groupId] = true;
        }
      });
    });
    
    setExpandedSteps(allSteps);
    setExpandedGroups(allGroups);
  };

  const collapseAll = () => {
    setExpandedSteps({});
    setExpandedGroups({});
  };

  const handleCopyLogs = () => {
    const fullText = steps.map(step => {
      const header = `=== Step: ${step.name} (${step.duration}) ===\n`;
      const lines = step.lines.map(l => `${String(l.lineNumber).padStart(4, ' ')}  ${l.text}`).join('\n');
      return header + lines;
    }).join('\n\n');

    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Harbor Blue and syntax token highlighting
  const renderLogLineText = (text: string) => {
    // Dynamic token highlighting: Harbor Blue (#2563eb / #3b82f6)
    // Regex matches URLs, file paths, repository identifiers, and keywords
    const regex = /(https?:\/\/[^\s]+|\/home\/runner\/[^\s'"]+|\/usr\/bin\/git[^\s'"]+|dist\/[^\s]+|actions\/checkout@v4|actions\/setup-node@v4|harbor-app\/action-deploy@v1|v\d+\.\d+\.\d+|'[2-9]\.\d+\.\d+'|SHA:[a-f0-9]+|HTTP 200 OK|Success|ERROR:.*|0 vulnerabilities|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+@\S+)/g;

    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) => {
          if (!part) return null;

          if (part.startsWith('ERROR:')) {
            return <span key={i} className="text-red-500 font-semibold">{part}</span>;
          }
          if (part === 'HTTP 200 OK' || part === 'Success' || part === '0 vulnerabilities') {
            return <span key={i} className="text-emerald-500 dark:text-emerald-400 font-semibold">{part}</span>;
          }
          if (
            part.startsWith('http') ||
            part.startsWith('/home/runner') ||
            part.startsWith('/usr/bin') ||
            part.startsWith('dist/') ||
            part.startsWith('actions/') ||
            part.startsWith('harbor-app') ||
            part.startsWith('SHA:')
          ) {
            return (
              <span key={i} className="text-[#2563eb] dark:text-[#3b82f6] font-medium hover:underline cursor-text">
                {part}
              </span>
            );
          }
          if (part.startsWith("'") && part.endsWith("'")) {
            return <span key={i} className="text-amber-500 dark:text-amber-400">{part}</span>;
          }
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-[#30363d]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900 dark:text-white font-[Geist]">
              GitHub Actions Logs
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-[#1f242c] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#30363d]">
              deploy
            </span>
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-[Geist] hidden sm:inline">
            Workflow: <span className="font-mono text-gray-700 dark:text-gray-300">{deployment.workflowFile || 'deploy.yml'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-white dark:bg-[#0d1117] border border-gray-300 dark:border-[#30363d] rounded-md text-gray-900 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-[#2563eb] font-[Geist]"
            />
          </div>

          {/* Toggle Timestamps */}
          <button
            onClick={() => setShowTimestamps(!showTimestamps)}
            className={`h-8 px-2.5 text-xs font-[Geist] font-medium rounded-md border transition-colors flex items-center gap-1.5 ${
              showTimestamps 
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-600 dark:text-blue-400' 
                : 'bg-white dark:bg-[#0d1117] border-gray-300 dark:border-[#30363d] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#161b22]'
            }`}
            title="Toggle Timestamps"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Timestamps</span>
          </button>

          {/* Expand / Collapse All */}
          <button
            onClick={expandAll}
            className="h-8 px-2.5 text-xs font-[Geist] font-medium rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors"
          >
            Expand all
          </button>
          <button
            onClick={collapseAll}
            className="h-8 px-2.5 text-xs font-[Geist] font-medium rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors"
          >
            Collapse all
          </button>

          {/* Copy logs */}
          <button
            onClick={handleCopyLogs}
            className="h-8 px-2.5 text-xs font-[Geist] font-medium rounded-md border border-gray-300 dark:border-[#30363d] bg-white dark:bg-[#0d1117] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#161b22] transition-colors flex items-center gap-1.5"
            title="Copy all logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* GitHub Actions Job Accordion List */}
      <div className="flex flex-col gap-2.5 w-full">
        {steps.map((step) => {
          const isExpanded = !!expandedSteps[step.id];
          
          // Filter lines if search query is active
          const displayedLines = searchQuery.trim()
            ? step.lines.filter(l => l.text.toLowerCase().includes(searchQuery.toLowerCase()))
            : step.lines;

          // If searching and this step has no matches, hide the step or show indicator
          if (searchQuery.trim() && displayedLines.length === 0) {
            return null;
          }

          return (
            <div 
              key={step.id} 
              className="rounded-md border border-gray-300 dark:border-[#30363d] overflow-hidden bg-white dark:bg-[#0d1117] transition-all"
            >
              {/* Job Step Header */}
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-[#161b22] dark:hover:bg-[#1f242c] transition-colors text-left select-none cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Chevron icon */}
                  <span className="text-gray-500 dark:text-gray-400 transition-transform duration-150">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    )}
                  </span>

                  {/* Status Circle Checkmark */}
                  {step.status === 'success' ? (
                    <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white dark:bg-[#e6edf3] text-gray-900 dark:text-[#0d1117] shrink-0">
                      <CheckCircle2 className="w-4 h-4 fill-emerald-500 text-white dark:fill-emerald-500 dark:text-[#0d1117]" />
                    </span>
                  ) : step.status === 'failed' ? (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin shrink-0" />
                  )}

                  {/* Step Title */}
                  <span className="text-[14px] font-medium text-gray-900 dark:text-[#e6edf3] font-[Geist] truncate">
                    {step.name}
                  </span>
                </div>

                {/* Duration */}
                <span className="font-mono text-xs text-gray-500 dark:text-[#8b949e] shrink-0 ml-4">
                  {step.duration}
                </span>
              </button>

              {/* Step Logs Body */}
              {isExpanded && (
                <div className="bg-gray-950 text-gray-100 dark:bg-[#0a0d12] py-2 overflow-x-auto border-t border-gray-200 dark:border-[#30363d]/60 font-geist-mono">
                  <div className="min-w-full inline-block">
                    {displayedLines.map((line, idx) => {
                      if (line.groupId && !line.isHeader && !expandedGroups[line.groupId]) {
                        return null; // hide line if it's in a collapsed group
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start hover:bg-white/[0.04] transition-colors py-[3px] px-2 text-[13.5px] sm:text-[14px] leading-6 group ${line.isHeader ? 'cursor-pointer select-none' : ''}`}
                          onClick={line.isHeader && line.groupId ? () => toggleGroup(line.groupId!) : undefined}
                        >
                          {/* Line Number */}
                          <span className="w-12 text-right pr-4 text-gray-500 dark:text-[#6e7681] select-none shrink-0 font-mono text-[13px] tabular-nums">
                            {line.lineNumber}
                          </span>

                          {/* Optional Timestamp */}
                          {showTimestamps && (
                            <span className="text-gray-500 dark:text-[#484f58] select-none shrink-0 font-mono text-[12px] pr-3 tabular-nums">
                              {line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : '00:00:0' + Math.min(9, line.lineNumber % 10)}
                            </span>
                          )}

                          {/* Line content */}
                          <span className={`whitespace-pre-wrap break-all text-gray-200 dark:text-[#e6edf3] font-geist-mono tracking-normal flex items-start ${line.isHeader ? 'font-semibold text-white' : ''} ${line.groupId && !line.isHeader ? 'pl-5' : ''}`}>
                            {line.isHeader && line.groupId && (
                              <span className="inline-block w-5 text-gray-400 dark:text-[#888] text-[12px] pt-[2px] shrink-0">
                                {expandedGroups[line.groupId] ? '▼' : '▶'}
                              </span>
                            )}
                            <span className="flex-1 min-w-0">
                              {renderLogLineText(line.text)}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
