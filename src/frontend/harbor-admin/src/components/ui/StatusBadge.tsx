import { Icon } from '../icons';
export type StatusType = 'ready' | 'pending' | 'error' | 'stopped' | 'running';

interface StatusBadgeProps {
  status?: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status = 'ready', label, className = '' }: StatusBadgeProps) {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <div 
      className={`inline-flex shrink-0 items-center justify-center rounded-full whitespace-nowrap h-6 px-3 pr-2.5 gap-1.5 text-[12px] leading-[24px] font-medium tabular-nums bg-transparent ring-1 ring-inset ring-gray-200 dark:ring-white/[0.14] hover:bg-gray-100 dark:hover:bg-[#1e1e1e] text-gray-900 dark:text-[#ededed] cursor-pointer w-fit transition-colors ${className}`}
      style={{ fontFamily: '"Geist", sans-serif' }}
    >
      <span className="relative flex items-center justify-center -ml-1">
        {status === 'running' ? (
          <Icon name="spinner" className="animate-spin w-3 h-3 text-[#3291ff]" />
        ) : (
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
            status === 'ready' ? 'bg-[#50e3c2]' :
            status === 'pending' ? 'bg-yellow-400' :
            status === 'error' ? 'bg-red-500' :
            'bg-gray-400'
          }`}></span>
        )}
      </span>
      <span data-testid="status-badge-label">{displayLabel}</span>
    </div>
  );
}
