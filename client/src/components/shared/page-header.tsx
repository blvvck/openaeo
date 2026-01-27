/**
 * PageHeader — Shared page header component
 *
 * Used by Dashboard and Visibility pages for consistent layout:
 * Title + subtitle on left, action (usually TimeRangeSelector) on right.
 */

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Page title (h1) */
  title: string;
  /** Subtitle/description text */
  subtitle: string;
  /** Right-side action slot (e.g., TimeRangeSelector) */
  action?: React.ReactNode;
  /** Enable responsive stacking on mobile */
  responsive?: boolean;
  /** Additional classes */
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  responsive = true,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        responsive
          ? 'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'
          : 'flex items-center justify-between',
        'mb-8 py-1',
        className,
      )}
    >
      <div>
        <h1 className="text-h1 font-semibold text-figma-primary tracking-tight">
          {title}
        </h1>
        <p className="text-figma-sm text-figma-secondary mt-1">
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

export default PageHeader;
