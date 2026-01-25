/**
 * StaleDataWarning — Cache age warning banner
 *
 * Shows when data is stale (>1 hour old) with refresh button.
 * Used by Dashboard and Visibility pages.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StaleDataWarningProps {
  /** Cache age in seconds */
  cacheAge: number | undefined;
  /** Refresh handler */
  onRefresh: () => void;
  /** Threshold in seconds to show warning (default: 3600 = 1 hour) */
  threshold?: number;
  /** Additional classes */
  className?: string;
}

export function StaleDataWarning({
  cacheAge,
  onRefresh,
  threshold = 3600,
  className,
}: StaleDataWarningProps) {
  // Don't show if no cache age or under threshold
  if (!cacheAge || cacheAge <= threshold) return null;

  const minutesAgo = Math.round(cacheAge / 60);

  return (
    <div
      className={cn(
        'mb-6 p-4 bg-amber-50 border border-figma-border rounded-xl flex items-center justify-between',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-figma-orange" />
        <span className="text-figma-sm text-figma-secondary">
          Data last updated {minutesAgo} minutes ago.
        </span>
      </div>
      <Button variant="ghost" size="sm" onClick={onRefresh}>
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </div>
  );
}

export default StaleDataWarning;
