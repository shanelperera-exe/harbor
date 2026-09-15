import type { EnvironmentType } from '../../services/environmentService';

const styles: Record<EnvironmentType, string> = {
  Development: 'text-sky-700 bg-sky-100 dark:text-sky-300 dark:bg-sky-950',
  Staging: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950',
  Production: 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-950',
};

export default function EnvironmentTypeBadge({ type }: { type: EnvironmentType }) {
  return <span className={`px-2 py-1 text-xs font-medium ${styles[type]}`}>{type}</span>;
}