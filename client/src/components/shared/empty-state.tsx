/**
 * ⚠️ CRITICAL CODE - Do not modify without review
 *
 * This file is registered in .claude/CRITICAL_CODE.md
 *
 * Why critical: Shared empty state used across all features
 * Dependencies: Dashboard, all "coming soon" pages, card empty states
 *
 * KNOWN GOTCHA: Uses explicit gray-400/gray-500 colors, NOT opacity modifiers.
 * Opacity modifiers don't work with CSS variables. Don't "fix" this.
 *
 * Before changing: Read CRITICAL_CODE.md entry first.
 */

import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, LucideIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  /** Subtle variant for "placeholder whispers" - fades into background */
  subtle?: boolean;
}


export function EmptyState({
  icon: Icon,
  illustration,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  subtle = false,
}: EmptyStateProps) {
  // Subtle variant - "placeholder whispers"
  if (subtle) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 px-4 text-center',
          className
        )}
      >
        {/* Icon - no background, very faded */}
        {Icon && (
          <Icon className="w-8 h-8 text-gray-300 dark:text-gray-600" aria-hidden="true" />
        )}

        {/* Custom Illustration */}
        {illustration && <div className="mt-3">{illustration}</div>}

        {/* Title - subtle */}
        <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mt-3">{title}</p>

        {/* Description - very subtle, constrained */}
        {description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-[220px] line-clamp-2">
            {description}
          </p>
        )}

        {/* Actions (if needed) */}
        {(primaryAction || secondaryAction) && (
          <div className="flex gap-3 mt-4">
            {primaryAction && (
              <Button size="sm" variant="ghost" onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button size="sm" variant="ghost" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant - for full-page empty states (muted but readable)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center min-h-[60vh]',
        className
      )}
    >
      {/* Icon - muted, no background */}
      {Icon && (
        <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" aria-hidden="true" />
      )}

      {/* Custom Illustration */}
      {illustration && <div className="mb-4">{illustration}</div>}

      {/* Title - muted */}
      <h3 className="text-xl font-medium text-gray-400 dark:text-gray-500 mb-2">{title}</h3>

      {/* Description - subtle */}
      {description && (
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md mb-6">{description}</p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3">
          {primaryAction && (
            <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ===== Error State =====

interface ErrorStateProps {
  title?: string;
  error?: string | Error;
  onRetry?: () => void;
  severity?: 'error' | 'warning';
  className?: string;
}

export function ErrorState({
  title,
  error,
  onRetry,
  severity = 'error',
  className,
}: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : error;
  const Icon = severity === 'warning' ? AlertTriangle : AlertCircle;
  const iconColor = severity === 'warning' ? 'text-amber-500' : 'text-red-400';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <Icon className={cn('w-12 h-12 mb-4', iconColor)} aria-hidden="true" />
      <h3 className="text-xl font-medium text-gray-400 dark:text-gray-500 mb-2">
        {title || (severity === 'warning' ? 'Warning' : 'Something went wrong')}
      </h3>
      {errorMessage && (
        <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md mb-6">
          {errorMessage}
        </p>
      )}
      {onRetry && (
        <Button onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Try again
        </Button>
      )}
    </div>
  );
}
