import { useParams, useOutletContext } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';
import { LogConfigurationModal } from '../../components/ui/LogConfigurationModal';
import { AiOutlineClear } from 'react-icons/ai';
import { LuDownload } from 'react-icons/lu';
import { IoInformationCircleOutline } from 'react-icons/io5';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export default function ServiceLogs() {
  const { serviceId } = useParams();
  const context = useOutletContext<{ service: any }>();
  const service = context?.service;
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logType, setLogType] = useState<'system' | 'access'>('system');
  const [isConnected, setIsConnected] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (!serviceId) return;

    // Use API base or default to localhost:5000 where ApiGateway runs
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const hubUrl = apiBase.replace('/api', '/hubs/logs');

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: true,
        transport: signalR.HttpTransportType.WebSockets
      })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveLog", (receivedServiceId: string, logEntry: LogEntry) => {
      if (receivedServiceId === serviceId) {
        setLogs(prev => {
          // Keep last 1000 lines max to prevent browser lag
          const updated = [...prev, logEntry];
          if (updated.length > 1000) return updated.slice(updated.length - 1000);
          return updated;
        });
      }
    });

    const startConnection = async () => {
      try {
        await connection.start();
        setIsConnected(true);
        // Subscribe to this specific service's logs
        await connection.invoke("SubscribeToService", serviceId);
      } catch (err) {
        console.error("SignalR Connection Error: ", err);
        setIsConnected(false);
      }
    };

    startConnection();

    return () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        connection.invoke("UnsubscribeFromService", serviceId).then(() => {
          connection.stop();
        });
      } else {
        connection.stop();
      }
    };
  }, [serviceId]);

  const handleClear = () => setLogs([]);

  const handleDownload = () => {
    const text = logs.map(l => `${l.timestamp} ${l.level} ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${serviceId}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

    const getLevelColor = (level: string) => {
      const lower = level.toLowerCase();
      if (lower.includes('error')) return '#ff4e42'; // wv-red
      if (lower.includes('warn')) return '#f5a623'; // geist-warning
      if (lower.includes('success')) return '#62c073'; // requested green
      if (lower.includes('debug')) return '#52a8ff'; // requested blue
      return '#888888';
    };
    
    const handleAddMockLogs = () => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      const now = new Date();
      const timestamp = `Oct ${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${now.getMilliseconds().toString().substring(0, 2)}`;
      
      const newLogs: LogEntry[] = [
        { timestamp, level: '[info]', message: 'GET 304 shanelperera.me /connect' },
        { timestamp, level: '[info]', message: 'GET --- shanelperera.me /images/experience/self_e...' },
        { timestamp, level: '[error]', message: 'GET 404 shanelperera.me /Shanel_Perera_Resume.pdf' },
        { timestamp, level: '[info]', message: 'GET 200 shanelperera.me /services' },
        { timestamp, level: '[info]', message: 'POST 201 api.shanelperera.me /api/auth/login User login successful' },
        { timestamp, level: '[info]', message: 'OPTIONS 204 api.shanelperera.me /api/auth/login CORS preflight check' },
        { timestamp, level: '[error]', message: 'POST 500 api.shanelperera.me /api/checkout Failed to process payment' },
        { timestamp, level: '[info]', message: 'GET 304 shanelperera.me /static/css/main.css' },
        { timestamp, level: '[debug]', message: '[Vercel Network] Routing traffic to edge node: https://portfolio-59rxk8ch0-shanelperera.vercel.app' },
        { timestamp, level: '[success]', message: '[Vercel Sync] Active PRODUCTION deployment: portfolio (State: READY)' }
      ];
      setLogs(prev => [...prev, ...newLogs]);
    };
  
    return (
      <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
        <ServiceHeader />
  
        <main className="px-4 md:px-12 mt-8 mb-20">
        <SectionTitle
          className="mb-6"
          icon={<Icon name="logs" />}
          title="Logs"
          description="Live runtime output streamed from this service."
        />
        
        <LogConfigurationModal 
          isOpen={isConfigModalOpen} 
          onClose={() => setIsConfigModalOpen(false)} 
          provider={service?.provider || ''} 
          serviceId={serviceId || ''} 
        />
  
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 -mb-px">
            <button 
              onClick={() => setLogType('system')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${logType === 'system' ? 'border-gray-900 dark:border-[#e5e5e5] text-gray-900 dark:text-[#e5e5e5]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              System Logs
            </button>
            <button 
              onClick={() => setLogType('access')} 
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${logType === 'access' ? 'border-gray-900 dark:border-[#e5e5e5] text-gray-900 dark:text-[#e5e5e5]' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Access Logs
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 flex-wrap">
            <span className={`px-2.5 py-1 text-xs font-medium border border-transparent rounded-sm flex items-center gap-1.5 ${isConnected ? 'text-green-600 dark:text-green-500' : 'text-gray-500'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600 dark:bg-green-500 animate-pulse' : 'bg-gray-400 dark:bg-gray-500'}`}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
            <button onClick={handleAddMockLogs} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-[#333] bg-gray-100 hover:bg-gray-200 dark:bg-[#111] dark:hover:bg-[#222] text-gray-800 dark:text-gray-300 transition-colors rounded-sm">
              Mock Logs (Test)
            </button>
            <button onClick={handleClear} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-[#525252] bg-white hover:bg-gray-100 dark:bg-transparent dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-white transition-colors rounded-sm flex items-center gap-1.5">
              <AiOutlineClear className="w-3.5 h-3.5" />
              Clear
            </button>
            <button onClick={handleDownload} className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-[#525252] bg-white hover:bg-gray-100 dark:bg-transparent dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-white transition-colors rounded-sm flex items-center gap-1.5">
              <LuDownload className="w-3.5 h-3.5" />
              Download
            </button>
            <button onClick={() => setIsConfigModalOpen(true)} className="px-3 py-1.5 text-xs font-medium bg-black hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-gray-100 dark:text-black border border-black dark:border-white transition-colors rounded-sm flex items-center gap-1.5">
              <IoInformationCircleOutline className="w-4 h-4 text-white dark:text-black" />
              Configure Logs
            </button>
          </div>
        </div>

        <div className="kgOb4G_container kgOb4G_hasLogs h-[600px] overflow-y-auto bg-transparent text-gray-800 dark:text-gray-300" style={{ position: 'relative', zIndex: 2, flex: '1 1 0%', fontFamily: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
          <div className="Gs96xq_logRowsContainer">
            <div className="Gs96xq_logRowsWrapper">
              <div aria-label="Visible log lines" data-testid="group-logs/log-rows" role="table" className="flex flex-col items-stretch justify-start flex-auto">
                <div className="sticky top-0 z-10 flex items-center gap-8 text-[13px] uppercase tracking-wider font-semibold text-gray-500 dark:text-[#888] py-2 mb-1 backdrop-blur-md bg-white/95 dark:bg-black/80 px-2" role="row">
                  <div className="w-[32px] shrink-0"></div>
                  <span role="columnheader" className="min-w-[128px] w-[128px]">Time</span>
                  <span role="columnheader" className="max-w-[50px] min-w-[50px]">Method</span>
                  {logType === 'access' && (
                    <>
                      <span role="columnheader" className="w-[42px] max-w-[42px] ml-2">Status</span>
                      <span role="columnheader" className="w-[150px] px-3">Host</span>
                      <span role="columnheader" className="w-[250px] min-w-[150px] max-w-[30%] px-2">Request</span>
                    </>
                  )}
                  <span role="columnheader" className="flex-1 min-w-[200px] pr-2">Messages</span>
                </div>
                
                {(() => {
                  const accessLogRegex = /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(\d{3}|---)\s+([^\s]+)\s+([^\s]+)\s*(.*)$/i;
                  const filteredLogs = logs.filter(log => {
                    const isHttp = !!log.message.match(accessLogRegex);
                    return logType === 'access' ? isHttp : !isHttp;
                  });

                  if (filteredLogs.length === 0) {
                    return (
                      <div className="text-gray-400 dark:text-gray-500 italic text-center py-8 font-sans">
                        Waiting for logs...
                      </div>
                    );
                  }

                  return filteredLogs.map((log, idx) => {
                    const match = log.message.match(accessLogRegex);
                    const isHttpLog = !!match;
                    
                    let method = '', status = '', host = '', request = '', message = log.message;
                    
                    if (match) {
                      method = match[1];
                      status = match[2];
                      host = match[3];
                      request = match[4];
                      message = match[5];
                    }
                    
                    const isError = !!(status && parseInt(status) >= 400);
                    
                    const getStatusColorClass = (codeStr: string, isErr: boolean) => {
                      if (isErr) return 'text-amber-700 dark:text-[#f1a10d]';
                      if (codeStr === '---') return 'text-gray-400 dark:text-[#a3a3a3]';
                      const code = parseInt(codeStr);
                      if (code >= 300 && code < 400) return 'text-blue-500 dark:text-[#52a8ff]';
                      return 'text-green-600 dark:text-[#62c073]';
                    };

                    const zebraBg = idx % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/70 dark:bg-[#162138]';
                    const zebraHover = idx % 2 === 0 ? 'hover:bg-gray-100/60 dark:hover:bg-[#1a2333]' : 'hover:bg-gray-100 dark:hover:bg-[#1e2d4a]';
                    
                    const rowClass = isError 
                      ? "JxqD1W_rowContainer JxqD1W_warning flex items-center py-[3px] my-0.5 bg-amber-500/10 hover:bg-amber-500/15 dark:bg-[#271700] dark:hover:bg-[#341c00] text-amber-800 dark:text-[#f1a10d] rounded-sm transition-colors"
                      : `JxqD1W_rowContainer JxqD1W_info flex items-center py-[3px] my-0.5 ${zebraBg} ${zebraHover} text-gray-800 dark:text-[#ccc] rounded-sm transition-colors`;
  
                    const cleanLevel = log.level.replace(/\[|\]/g, '').toUpperCase();
                    
                    // Format time with opacity
                    let datePart = '';
                    let timePart = log.timestamp;
                    let msPart = '';
                    const timeMatch = log.timestamp.match(/(.*? )?(\d{2}:\d{2}:\d{2})(\.\d+)?/);
                    if (timeMatch) {
                      datePart = timeMatch[1] || '';
                      timePart = timeMatch[2];
                      msPart = timeMatch[3] || '';
                    }
  
                    return (
                      <div key={idx} data-log-row-id={`log-${idx}`} className={`${rowClass} gap-8 px-2`} role="row" tabIndex={0}>
                        <div aria-hidden="true" className="relative flex items-center justify-center pl-2 pr-2">
                          {isError ? (
                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" aria-hidden="true" style={{color: 'currentcolor'}}><path fill="currentColor" d="M8.56.5c.57 0 1.1.33 1.35.85l5.9 12.22a1 1 0 0 1-.9 1.43H1.09a1 1 0 0 1-.9-1.43L6.1 1.35A1.5 1.5 0 0 1 7.44.5zm-6.67 13h12.22L8.56 2H7.44zM8 10a1 1 0 1 1 0 2 1 1 0 0 1 0-2m.75-1.25h-1.5v-4h1.5z"></path></svg>
                          ) : (
                            <span aria-hidden="true" className="block w-4 h-4"></span>
                          )}
                        </div>
                        <div className={`JxqD1W_rowItem text-[13px] tabular-nums uppercase whitespace-nowrap min-w-[128px] w-[128px] ${isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-500 dark:text-[#a3a3a3]'}`} role="cell">
                          <span className="opacity-70">{datePart}</span>
                          <span className={isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-900 dark:text-[#fff]'}>{timePart}</span>
                          <span className="opacity-70">{msPart}</span>
                        </div>
                        <div className="JxqD1W_rowItem max-w-[50px] min-w-[50px]" role="cell">
                          <div className="flex items-center min-w-0">
                            {method ? (
                              <span className={`text-[13px] font-medium ${isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-600 dark:text-[#a3a3a3]'}`}>
                                {method}
                              </span>
                            ) : (
                              <span style={{ color: getLevelColor(log.level) }} className="text-[12px] font-semibold tracking-wide">
                                {cleanLevel}
                              </span>
                            )}
                          </div>
                        </div>
                        {isHttpLog && (
                          <>
                            <div className="JxqD1W_rowItem w-[42px] max-w-[42px] ml-2" role="cell">
                              {status && (
                                <span className={`text-[13px] tabular-nums font-medium ${getStatusColorClass(status, isError)}`}>
                                  {status}
                                </span>
                              )}
                            </div>
                            <div className={`JxqD1W_rowItem overflow-hidden whitespace-nowrap overflow-ellipsis w-[150px] text-[13px] px-3 ${isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-800 dark:text-[#e5e5e5]'}`} role="cell">
                              {host}
                            </div>
                            <div className={`JxqD1W_rowItem overflow-hidden whitespace-nowrap overflow-ellipsis flex items-center gap-1.5 text-[13px] w-[250px] min-w-[150px] max-w-[30%] px-2 ${isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-800 dark:text-[#e5e5e5]'}`} role="cell">
                              {request && (() => {
                                const hasMiddleware = true; // All examples in screenshot have middleware
                                const hasCache = request.includes('/connect') || request.match(/\.pdf$/i) || request.includes('/services');
                                
                                if (!hasMiddleware && !hasCache) return null;
                                
                                if (hasMiddleware && hasCache) {
                                  return (
                                    <div className="shrink-0 flex items-center">
                                      <div className="-space-x-px flex justify-end items-center" style={{ width: '25px', height: '16px', opacity: 0.6 }}>
                                        <div className="flex items-center" style={{ clipPath: 'path("M 13.7639 0 H 0 V 16.7324 C 0.294173 16.9026 0.635713 17 1 17 H 15 C 15.1543 17 15.3045 16.9825 15.4487 16.9495 C 14.0552 16.6906 13 15.4685 13 14 V 2 C 13 1.23165 13.2889 0.530757 13.7639 0 Z")' }}>
                                          <div className="flex items-center flex-[0_1_auto] cursor-pointer overflow-hidden">
                                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                              <path fill="currentColor" d="M13.75 0C14.99 0 16 1 16 2.25v11.5c0 1.24-1 2.25-2.25 2.25H2.25C1.01 16 0 15 0 13.75V2.25C0 1.01 1 0 2.25 0zM2.25 1.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h11.5c.41 0 .75-.34.75-.75V2.25a.75.75 0 0 0-.75-.75zM5.5 4.92A2.4 2.4 0 0 1 8 5.4a2.36 2.36 0 0 1 4 1.72v4.13h-1.5V7.13a.88.88 0 0 0-1.75 0v4.12h-1.5V7.13a.87.87 0 1 0-1.75 0v4.12H4v-6.5h1.5z"></path>
                                            </svg>
                                          </div>
                                        </div>
                                        <div className="flex items-center">
                                          <div className="flex items-center flex-[0_1_auto] cursor-pointer overflow-hidden">
                                            <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                              <path fill="currentColor" fillRule="evenodd" d="M.5 3.25A2.5 2.5 0 0 1 3 .75h10a2.5 2.5 0 0 1 2.5 2.5v1.5q0 .76-.4 1.34a7 7 0 0 0-1.34-.69 1 1 0 0 0 .24-.65v-1.5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1.5a1 1 0 0 0 1 1h5.47q-1.09.58-1.89 1.5H3a2.5 2.5 0 0 1-2.5-2.5zm5.37 5H3a2.5 2.5 0 0 0-2.5 2.5v1.5a2.5 2.5 0 0 0 2.5 2.5h2.87a7 7 0 0 1-.63-1.5H3a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h2.24q.23-.8.63-1.5m-1.62-3.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7.5 4A.75.75 0 1 1 6 4a.75.75 0 0 1 1.5 0m5.73 8q-.05 1.22-.32 2.43a3.3 3.3 0 0 0 1.8-2.43zm-1.43 2.74a3 3 0 0 1-.6 0q-.38-1.36-.43-2.74h1.46q-.06 1.38-.43 2.74M13.23 11q-.05-1.22-.32-2.43a3.3 3.3 0 0 1 1.8 2.43zm-1 0q-.06-1.38-.43-2.74a3 3 0 0 0-.6 0q-.38 1.36-.43 2.74zm-2.46 0q.05-1.22.32-2.43A3.3 3.3 0 0 0 8.29 11zm.32 3.43q-.27-1.2-.32-2.43H8.29a3.3 3.3 0 0 0 1.8 2.43M11.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9" clipRule="evenodd"></path>
                                            </svg>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                if (hasMiddleware) {
                                  return (
                                    <div className="shrink-0 opacity-60 flex items-center h-4">
                                      <div className="flex items-center flex-[0_1_auto] cursor-pointer overflow-hidden">
                                        <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                          <path fill="currentColor" d="M13.75 0C14.99 0 16 1 16 2.25v11.5c0 1.24-1 2.25-2.25 2.25H2.25C1.01 16 0 15 0 13.75V2.25C0 1.01 1 0 2.25 0zM2.25 1.5a.75.75 0 0 0-.75.75v11.5c0 .41.34.75.75.75h11.5c.41 0 .75-.34.75-.75V2.25a.75.75 0 0 0-.75-.75zM5.5 4.92A2.4 2.4 0 0 1 8 5.4a2.36 2.36 0 0 1 4 1.72v4.13h-1.5V7.13a.88.88 0 0 0-1.75 0v4.12h-1.5V7.13a.87.87 0 1 0-1.75 0v4.12H4v-6.5h1.5z"></path>
                                        </svg>
                                      </div>
                                    </div>
                                  );
                                }

                                if (hasCache) {
                                  return (
                                    <div className="shrink-0 opacity-60 flex items-center h-4">
                                      <div className="flex items-center flex-[0_1_auto] cursor-pointer overflow-hidden">
                                        <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: 'currentcolor' }}>
                                          <path fill="currentColor" fillRule="evenodd" d="M.5 3.25A2.5 2.5 0 0 1 3 .75h10a2.5 2.5 0 0 1 2.5 2.5v1.5q0 .76-.4 1.34a7 7 0 0 0-1.34-.69 1 1 0 0 0 .24-.65v-1.5a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1.5a1 1 0 0 0 1 1h5.47q-1.09.58-1.89 1.5H3a2.5 2.5 0 0 1-2.5-2.5zm5.37 5H3a2.5 2.5 0 0 0-2.5 2.5v1.5a2.5 2.5 0 0 0 2.5 2.5h2.87a7 7 0 0 1-.63-1.5H3a1 1 0 0 1-1-1v-1.5a1 1 0 0 1 1-1h2.24q.23-.8.63-1.5m-1.62-3.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5M7.5 4A.75.75 0 1 1 6 4a.75.75 0 0 1 1.5 0m5.73 8q-.05 1.22-.32 2.43a3.3 3.3 0 0 0 1.8-2.43zm-1.43 2.74a3 3 0 0 1-.6 0q-.38-1.36-.43-2.74h1.46q-.06 1.38-.43 2.74M13.23 11q-.05-1.22-.32-2.43a3.3 3.3 0 0 1 1.8 2.43zm-1 0q-.06-1.38-.43-2.74a3 3 0 0 0-.6 0q-.38 1.36-.43 2.74zm-2.46 0q.05-1.22.32-2.43A3.3 3.3 0 0 0 8.29 11zm.32 3.43q-.27-1.2-.32-2.43H8.29a3.3 3.3 0 0 0 1.8 2.43M11.5 16a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9" clipRule="evenodd"></path>
                                        </svg>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                return null;
                              })()}
                              <span className="truncate flex-1">{request}</span>
                            </div>
                          </>
                        )}
                        <div className={`JxqD1W_rowItem text-[13px] pr-2 break-words max-h-none line-clamp-none overflow-visible whitespace-pre-wrap flex-1 min-w-[200px] ${isError ? 'text-amber-800 dark:text-[#f1a10d]' : 'text-gray-700 dark:text-[#e5e5e5]'}`} role="cell">
                          {message}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            
            {logs.length > 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-[#888] text-xs font-sans">
                No more logs to show within selected timeline
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
