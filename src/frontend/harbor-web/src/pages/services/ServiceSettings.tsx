import { Settings as SettingsIcon } from 'lucide-react';

export default function ServiceSettings() {
  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-4 md:px-12 mt-8 mb-20 space-y-8">
      
      <div className="flex items-center gap-2 border-b border-gray-300 dark:border-[#525252] pb-4">
        <SettingsIcon className="w-5 h-5 text-gray-500" />
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Settings</h2>
      </div>

      {/* General Settings Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-[#f0f0f0]">General</h3>
        <div className="grid gap-6 p-6 border border-gray-300 dark:border-[#525252] rounded-md bg-white dark:bg-[#141414]">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Service Name</label>
            <input type="text" className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white" defaultValue="settle-distributed-backend" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Build Command</label>
            <input type="text" className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-sm" placeholder="e.g. npm run build" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-[#cccccc]">Start Command</label>
            <input type="text" className="h-10 px-3 bg-transparent border border-gray-300 dark:border-[#525252] rounded-sm focus:border-[#2563eb] focus:outline-none dark:text-white font-mono text-sm" placeholder="e.g. npm start" />
          </div>
          <div className="pt-2">
            <button className="h-10 px-4 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium rounded-sm transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone Section */}
      <section className="space-y-4">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-500">Danger Zone</h3>
        <div className="p-6 border border-red-200 dark:border-[#4c1d1d] rounded-md bg-red-50 dark:bg-[#1f0f0f]">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-[#f0f0f0]">Delete Service</h4>
              <p className="text-sm text-gray-600 dark:text-[#a3a3a3] mt-1">Once you delete a service, there is no going back. Please be certain.</p>
            </div>
            <button className="h-10 px-4 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 font-medium rounded-sm transition-colors">
              Delete Service
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
