import type { ReactNode } from 'react';

interface SectionTitleProps {
  /** Icon shown before the title — should match the icon used in the SideNav. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Optional right-side controls (buttons, selects, counters…). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Shared section title used below the ServiceHeader on every service sub-page
 * (Deployments, CI History, Settings, Logs, Metrics, Environment).
 *
 * Minimal, Google-style heading: plain outline icon, regular-weight title,
 * muted supporting text and a hairline divider.
 */
export default function SectionTitle({ icon, title, description, actions, className = '' }: SectionTitleProps) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-gray-200 dark:border-white/10 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-3 text-[28px] leading-9 font-normal tracking-[-0.01em] text-gray-900 dark:text-[#f0f0f0] font-['Roobert',sans-serif]">
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 text-gray-600 dark:text-[#c7c7c7] [&_svg]:w-6 [&_svg]:h-6"
          >
            {icon}
          </span>
          <span className="truncate">{title}</span>
        </h2>
        {description && (
          <p className="mt-1.5 text-sm leading-5 text-gray-500 dark:text-[#9a9a9a]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
