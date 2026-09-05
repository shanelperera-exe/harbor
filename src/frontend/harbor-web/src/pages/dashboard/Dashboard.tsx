export default function Dashboard() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white dark:bg-[#090909] text-gray-900 dark:text-white text-center px-4 transition-colors duration-300">
      <h1 className="text-2xl font-medium mb-4 tracking-tight">Welcome to Harbor</h1>
      <p className="text-[16px] text-gray-500 dark:text-[#a1a1aa] max-w-md mx-auto mb-8 transition-colors duration-300">
        You don't have any projects yet. Create a new project to get started.
      </p>
      <div className="flex gap-4">
        <a href="/projects/new" className="h-10 px-4 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-[15px] transition-colors flex items-center justify-center rounded-none gap-1">
          New Project <span className="text-lg leading-none mb-0.5">+</span>
        </a>
      </div>
    </div>
  );
}
