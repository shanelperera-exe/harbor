export default function Dashboard() {
  
  return (
    <div className="flex-1 w-full bg-[#f9f9f9] dark:bg-[#090909] text-black dark:text-white transition-colors duration-300 pb-20">
      <div className="w-full max-w-[1400px] mx-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-medium tracking-tight">Admin Dashboard</h1>
            <p className="text-[#8f8f8f] text-sm mt-1">Manage users, system configurations, and Harbor infrastructure.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#090909] border border-gray-200 dark:border-[#333] p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-2">Users Overview</h2>
              <p className="text-sm text-[#8f8f8f]">Manage user roles, disable accounts, or view activity.</p>
              <button className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-90 transition-opacity">
                View Users
              </button>
            </div>
            
            <div className="bg-white dark:bg-[#090909] border border-gray-200 dark:border-[#333] p-6 shadow-sm">
              <h2 className="text-lg font-medium mb-2">System Settings</h2>
              <p className="text-sm text-[#8f8f8f]">Configure authentication, email providers, and global limits.</p>
              <button className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium text-sm hover:opacity-90 transition-opacity">
                Manage Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
