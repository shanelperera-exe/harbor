import { useParams } from 'react-router-dom';
import { Icon } from '../../components/icons';
import ServiceHeader from './ServiceHeader';
import SectionTitle from '../../components/ui/SectionTitle';

export default function ServiceLogs() {
  const { serviceId } = useParams();

  return (
    <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto">
      <ServiceHeader />

      <main className="px-4 md:px-12 mt-8 mb-20">
      <SectionTitle
        className="mb-6"
        icon={<Icon name="logs" />}
        title="Logs"
        description="Live runtime output streamed from this service."
        actions={
          <>
            <button className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm">
              Clear
            </button>
            <button className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-[#525252] bg-transparent hover:bg-gray-100 dark:hover:bg-[#1a1a1a] text-gray-900 dark:text-white transition-colors rounded-sm">
              Download
            </button>
          </>
        }
      />

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
      </main>
    </div>
  );
}
