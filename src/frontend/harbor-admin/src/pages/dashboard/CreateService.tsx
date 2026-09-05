const services = [
  {
    id: 'static',
    title: 'Static Sites',
    description: 'Static content served over a global CDN. Ideal for frontend, blogs, and content sites.',
    actionText: 'New Static Site',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    )
  },
  {
    id: 'web',
    title: 'Web Services',
    description: 'Dynamic web app. Ideal for full-stack apps, API servers, and mobile backends.',
    actionText: 'New Web Service',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  },
  {
    id: 'private',
    title: 'Private Services',
    description: 'Web app hosted on a private network, accessible only from your other Render services.',
    actionText: 'New Private Service',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    )
  },
  {
    id: 'worker',
    title: 'Background Workers',
    description: 'Long-lived services that process async tasks, usually from a job queue.',
    actionText: 'New Worker',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    )
  },
  {
    id: 'cron',
    title: 'Cron Jobs',
    description: 'Short-lived tasks that run on a periodic schedule.',
    actionText: 'New Cron Job',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'postgres',
    title: 'Postgres',
    description: 'Relational data storage. Supports point-in-time recovery, read replicas, and high availability.',
    actionText: 'New Postgres',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    )
  },
  {
    id: 'keyvalue',
    title: 'Key Value',
    description: 'Managed Redis®-compatible storage. Ideal for use as a shared cache, message broker, or job queue.',
    actionText: 'New Key Value Instance',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    id: 'workflow',
    title: 'Workflow',
    description: 'Run thousands of parallel tasks with zero ops overhead.',
    actionText: 'New Workflow',
    icon: (
      <svg className="w-5 h-5 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },
];

export default function CreateService() {
  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[#090909] transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">
          Create a new <span className="text-gray-500 dark:text-gray-400 transition-colors duration-300">Service</span>
        </h1>
        <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center text-[15px] transition-colors duration-300">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
          Skip
        </a>
      </div>

      <div className="flex justify-between items-center border-b border-solid border-gray-200 dark:border-[#333] pb-4 mb-8 text-[15px] transition-colors duration-300">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
          <span className="flex items-center justify-center w-5 h-5 rounded-none bg-blue-600 dark:bg-purple-600 text-white text-[12px] font-medium transition-colors duration-300">1</span>
          <span className="font-medium text-gray-900 dark:text-white transition-colors duration-300">Choose service</span>
          <span className="text-gray-400 dark:text-gray-600 transition-colors duration-300">&gt;</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-none border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-[12px] font-medium transition-colors duration-300">2</span>
          <span>Configure</span>
          <span className="text-gray-400 dark:text-gray-600 transition-colors duration-300">&gt;</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-none border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-[12px] font-medium transition-colors duration-300">3</span>
          <span>Deploy</span>
        </div>
        <div>
          <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline underline-offset-4 transition-colors duration-300">Which to use?</a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service) => (
          <button
            key={service.id}
            className="flex flex-col text-left p-5 rounded-none border border-solid border-gray-200 dark:border-[#333] hover:border-gray-400 dark:hover:border-gray-400 transition-colors bg-white dark:bg-[#111111] group"
          >
            <div className="flex items-center space-x-2 mb-2">
              <div className="text-gray-600 dark:text-gray-300 transition-colors duration-300">
                {service.icon}
              </div>
              <h2 className="text-lg font-medium">{service.title}</h2>
            </div>
            <p className="text-gray-500 dark:text-[#a1a1aa] text-[15px] mb-6 flex-grow leading-relaxed transition-colors duration-300">
              {service.description}
            </p>
            <div className="text-blue-600 dark:text-[#a585ff] group-hover:text-blue-700 dark:group-hover:text-[#bca4ff] text-[15px] font-medium flex items-center transition-colors duration-300">
              {service.actionText}
              <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
