import { useParams } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function ServiceMetrics() {
  useParams();

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-500" />
          Metrics
        </h2>
        <select className="bg-transparent border border-gray-300 dark:border-[#525252] text-gray-900 dark:text-white text-sm rounded-sm px-3 py-1.5 focus:outline-none focus:border-[#2563eb]">
          <option value="1h">Last 1 hour</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-gray-300 dark:border-[#525252] rounded-md bg-white dark:bg-[#141414]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-[#8f8f8f] mb-4">CPU Usage</h3>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-[#525252] border border-dashed border-gray-200 dark:border-[#333] rounded-sm">
            Chart coming soon
          </div>
        </div>
        <div className="p-6 border border-gray-300 dark:border-[#525252] rounded-md bg-white dark:bg-[#141414]">
          <h3 className="text-sm font-medium text-gray-500 dark:text-[#8f8f8f] mb-4">Memory Usage</h3>
          <div className="h-64 flex items-center justify-center text-gray-400 dark:text-[#525252] border border-dashed border-gray-200 dark:border-[#333] rounded-sm">
            Chart coming soon
          </div>
        </div>
      </div>
    </div>
  );
}
