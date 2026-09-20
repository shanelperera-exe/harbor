import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { XCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ServiceDeploys() {
  const { serviceId } = useParams();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const token = localStorage.getItem('harbor_token');
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        // Fetch deployments. Note: We use the actual service ID.
        const res = await fetch(`${apiBase}/deployments?serviceId=${serviceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          setDeployments(json.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch deployments:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeployments();
  }, [serviceId]);

  const filteredDeployments = deployments.filter(d => 
    (d.commitSha && d.commitSha.includes(search)) ||
    (d.version && d.version.includes(search))
  );

  return (
    <main className="px-4 md:px-12 mt-8 mb-20 flex flex-col gap-6">
      {/* Search */}
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search deploys and commits" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            <span className="inline-flex items-center justify-center px-1.5 h-4 bg-gray-100 dark:bg-[#272727] text-gray-600 dark:text-gray-300 rounded-sm font-sans text-[10px]">
              {deployments.length}
            </span>
          </div>
          <div className="col-span-2 hidden md:block">TRIGGER</div>
          <div className="col-span-2 hidden md:block">DURATION</div>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading deployments...</div>
          ) : filteredDeployments.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              {search ? 'No deployments match your search.' : 'No deployments found for this service.'}
            </div>
          ) : (
            filteredDeployments.map((deploy) => {
              const isFailed = deploy.status === 'Failed';
              const isSuccess = deploy.status === 'Completed' || deploy.status === 'Success';
              
              const durationStr = deploy.completedAt && deploy.startedAt
                ? `${Math.max(1, Math.round((new Date(deploy.completedAt).getTime() - new Date(deploy.startedAt).getTime()) / 1000))}s`
                : '-';

              return (
                <div key={deploy.id} className="grid grid-cols-12 gap-4 py-4 border-b border-gray-300 dark:border-[#525252] items-start hover:bg-gray-50 dark:hover:bg-[#141414] transition-colors cursor-pointer group rounded-sm px-2 -mx-2">
                  <div className="col-span-12 md:col-span-8 flex gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {isFailed ? (
                        <div className="bg-[#af1d27] text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide">
                          <XCircle className="w-3 h-3" /> Failed
                        </div>
                      ) : isSuccess ? (
                        <div className="bg-emerald-600 dark:bg-emerald-700 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide">
                          <CheckCircle className="w-3 h-3" /> Success
                        </div>
                      ) : (
                        <div className="bg-blue-500 dark:bg-blue-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-sm flex items-center gap-1 h-5 tracking-wide">
                          <Clock className="w-3 h-3 animate-pulse" /> {deploy.status}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-[#f0f0f0] group-hover:text-[#3b82f6] truncate">
                        {deploy.version || 'Auto Deploy'}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8f8f8f]">
                        {deploy.commitSha && (
                          <>
                            <span className="font-mono bg-gray-100 dark:bg-[#272727] px-1.5 py-0.5 rounded-sm">
                              {deploy.commitSha.substring(0, 7)}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span className="truncate">
                          Deployed {formatDistanceToNow(new Date(deploy.startedAt))} ago
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-1 hidden md:block">
                    {deploy.version === 'Initial Deploy' ? 'First Deploy' : 'Deploy'}
                  </div>
                  <div className="col-span-2 text-sm text-gray-500 dark:text-[#8f8f8f] pt-1 font-mono hidden md:block">
                    {durationStr}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
