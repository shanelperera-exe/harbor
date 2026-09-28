import { Icon } from '../../components/icons';
const services = [
  {
    id: 'static',
    title: 'Static Sites',
    description: 'Static content served over a global CDN. Ideal for frontend, blogs, and content sites.',
    actionText: 'New Static Site',
    icon: (
      <Icon name="serviceStatic" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'web',
    title: 'Web Services',
    description: 'Dynamic web app. Ideal for full-stack apps, API servers, and mobile backends.',
    actionText: 'New Web Service',
    icon: (
      <Icon name="serviceWeb" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'private',
    title: 'Private Services',
    description: 'Web app hosted on a private network, accessible only from your other Render services.',
    actionText: 'New Private Service',
    icon: (
      <Icon name="servicePrivate" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'worker',
    title: 'Background Workers',
    description: 'Long-lived services that process async tasks, usually from a job queue.',
    actionText: 'New Worker',
    icon: (
      <Icon name="serviceWorker" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'cron',
    title: 'Cron Jobs',
    description: 'Short-lived tasks that run on a periodic schedule.',
    actionText: 'New Cron Job',
    icon: (
      <Icon name="serviceCron" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'postgres',
    title: 'Postgres',
    description: 'Relational data storage. Supports point-in-time recovery, read replicas, and high availability.',
    actionText: 'New Postgres',
    icon: (
      <Icon name="servicePostgres" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'keyvalue',
    title: 'Key Value',
    description: 'Managed Redis®-compatible storage. Ideal for use as a shared cache, message broker, or job queue.',
    actionText: 'New Key Value Instance',
    icon: (
      <Icon name="serviceKeyValue" className="w-5 h-5 mb-2" />
    )
  },
  {
    id: 'workflow',
    title: 'Workflow',
    description: 'Run thousands of parallel tasks with zero ops overhead.',
    actionText: 'New Workflow',
    icon: (
      <Icon name="serviceWorkflow" className="w-5 h-5 mb-2" />
    )
  },
];

export default function CreateService() {
  return (
    <div className="w-full h-full p-8 lg:px-24 xl:px-48 text-gray-900 dark:text-white overflow-y-auto bg-white dark:bg-[oklch(0.21_0.03_263.45)] transition-colors duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold">
          Create a new <span className="text-gray-500 dark:text-gray-400 transition-colors duration-300">Service</span>
        </h1>
        <a href="#" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center text-[15px] transition-colors duration-300">
          <Icon name="skipForward" className="w-4 h-4 mr-1" />
          Skip
        </a>
      </div>

      <div className="flex justify-between items-center border-b border-solid border-gray-300 dark:border-[#525252] pb-4 mb-8 text-[15px] transition-colors duration-300">
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 transition-colors duration-300">
          <span className="flex items-center justify-center w-5 h-5 rounded-sm bg-blue-600 dark:bg-blue-600 text-white text-[12px] font-medium transition-colors duration-300">1</span>
          <span className="font-medium text-gray-900 dark:text-white transition-colors duration-300">Choose service</span>
          <span className="text-gray-400 dark:text-gray-600 transition-colors duration-300">&gt;</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-sm border border-gray-300 dark:border-[#525252] dark:border-gray-600 text-gray-500 dark:text-gray-400 text-[12px] font-medium transition-colors duration-300">2</span>
          <span>Configure</span>
          <span className="text-gray-400 dark:text-gray-600 transition-colors duration-300">&gt;</span>
          <span className="flex items-center justify-center w-5 h-5 rounded-sm border border-gray-300 dark:border-[#525252] dark:border-gray-600 text-gray-500 dark:text-gray-400 text-[12px] font-medium transition-colors duration-300">3</span>
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
            className="flex flex-col text-left p-5 rounded-sm border border-solid border-gray-300 dark:border-[#525252] hover:border-gray-400 dark:hover:border-gray-400 transition-colors bg-white dark:bg-[oklch(0.21_0.03_263.45)] group"
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
            <div className="text-blue-600 dark:text-[#3b82f6] group-hover:text-blue-700 dark:group-hover:text-[#60a5fa] text-[15px] font-medium flex items-center transition-colors duration-300">
              {service.actionText}
              <Icon name="arrowRightLong" className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
