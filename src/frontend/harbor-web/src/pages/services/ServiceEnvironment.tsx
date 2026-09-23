import { useState } from 'react';
import { Database, Plus, Eye, EyeOff } from 'lucide-react';

export default function ServiceEnvironment() {
  const [showValues, setShowValues] = useState(false);
  
  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-500" />
          Environment Variables
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowValues(!showValues)}
            className="px-3 py-1.5 flex items-center gap-2 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm"
          >
            {showValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showValues ? 'Hide Values' : 'Reveal Values'}
          </button>
          <button className="px-3 py-1.5 flex items-center gap-2 text-sm font-medium bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors rounded-sm">
            <Plus className="w-4 h-4" />
            Add Variable
          </button>
        </div>
      </div>

      <div className="border border-gray-300 dark:border-[#525252] rounded-md overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-[#141414] border-b border-gray-300 dark:border-[#525252]">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-[#8f8f8f]">Key</th>
              <th className="px-4 py-3 font-medium text-gray-500 dark:text-[#8f8f8f]">Value</th>
              <th className="px-4 py-3 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-[#333] bg-white dark:bg-transparent">
            {/* Example Empty State */}
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-[#8f8f8f]">
                No environment variables defined for this service.
              </td>
            </tr>
            {/* Real vars will go here */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
