import type { EnvironmentType } from '../../services/environmentService';

const styles: Record<EnvironmentType, string> = {
  Development: 'text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-950',
  Staging: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950',
  Production: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-950',
};

export default function EnvironmentTypeBadge({ type }: { type: EnvironmentType }) {
  return <span className={`px-2 py-1 text-xs font-medium ${styles[type]}`}>{type}</span>;
}