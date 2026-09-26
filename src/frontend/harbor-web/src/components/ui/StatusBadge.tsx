export type StatusType = 'ready' | 'pending' | 'error' | 'stopped';

interface StatusBadgeProps {
  status?: StatusType;
  label?: string;
  className?: string;
}

export function StatusBadge({ status = 'ready', label, className = '' }: StatusBadgeProps) {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  
  let colorClass = 'bg-[#50e3c2]'; // ready
  if (status === 'pending') colorClass = 'bg-yellow-400';
  if (status === 'error') colorClass = 'bg-red-500';
  if (status === 'stopped') colorClass = 'bg-gray-400';

  return (
    <div 
      className={`inline-flex shrink-0 items-center justify-center rounded-full whitespace-nowrap h-6 px-3 pr-2.5 gap-1.5 text-[12px] leading-[24px] font-medium tabular-nums bg-transparent ring-1 ring-inset ring-gray-200 dark:ring-white/[0.14] hover:bg-gray-100 dark:hover:bg-[#272727] text-gray-900 dark:text-[#ededed] cursor-pointer w-fit transition-colors ${className}`}
      style={{ fontFamily: '"Geist", sans-serif' }}
    >
      <span className="relative flex items-center justify-center -ml-1">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorClass}`}></span>
      </span>
      <span>{displayLabel}</span>
    </div>
  );
}
