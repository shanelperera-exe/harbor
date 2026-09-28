import type { EnvironmentType } from '../../services/environmentService';
import { BiSolidBolt } from 'react-icons/bi';

const styles: Record<EnvironmentType, string> = {
  Development: 'text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-950',
  Staging: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950',
  Production: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950',
};

export default function EnvironmentTypeBadge({ type }: { type: EnvironmentType }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${styles[type]}`}>
      {type === 'Production' && <BiSolidBolt className="w-3 h-3 shrink-0" />}
      {type}
    </span>
  );
}