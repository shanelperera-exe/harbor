import { useParams } from 'react-router-dom';
import { Terminal } from 'lucide-react';

export default function ServiceLogs() {
  const { serviceId } = useParams();

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-gray-500" />
          Runtime Logs
        </h2>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm">
            Clear
          </button>
          <button className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm">
            Download
          </button>
        </div>
      </div>

      <div className="bg-[#0d0d0d] rounded-md border border-[#333] h-[600px] p-4 overflow-y-auto font-mono text-sm text-gray-300">
        <div className="flex gap-4">
          <span className="text-gray-600">12:00:01</span>
          <span className="text-blue-400">[info]</span>
          <span>Starting service {serviceId}...</span>
        </div>
        <div className="flex gap-4">
          <span className="text-gray-600">12:00:02</span>
          <span className="text-blue-400">[info]</span>
          <span>Listening on port 8080</span>
        </div>
        {/* Real logs will be streamed here */}
      </div>
    </div>
  );
}
