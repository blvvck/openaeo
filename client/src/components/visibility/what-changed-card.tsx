
/**
 * WhatChangedCard — Metric movement chips for Overview Row 3.
 *
 * Shows whatChanged items from the visibility overview API response.
 * Each chip has direction arrow, message, and optional platform icons.
 *
 * API: GET /api/visibility/overview → response.whatChanged
 */

import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared/dashboard-card';
import { Skeleton } from '@/components/shared/skeleton-loader';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ChevronRight } from 'lucide-react';
import type { ChangeItem } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface WhatChangedCardProps {
  changes: ChangeItem[];
  isLoading?: boolean;
  onViewTrends?: () => void;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function WhatChangedCard({ changes, isLoading, onViewTrends, className }: WhatChangedCardProps) {
  // Loading
  if (isLoading) {
    return (
      <ContentCard title="What changed this week" subtitle="Key metric movements" className={className}>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-3 rounded-lg bg-figma-hover">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
            </div>
          ))}
        </div>
      </ContentCard>
    );
  }

  // Empty
  if (!changes || changes.length === 0) {
    return (
      <ContentCard title="What changed this week" subtitle="Key metric movements" className={className}>
        <div className="py-6 text-center">
          <p className="text-figma-sm text-figma-muted">No significant changes this period.</p>
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      title="What changed this week"
      subtitle="Key metric movements"
      className={className}
    >
      <div className="space-y-2">
        {changes.map((change, i) => {
          const isUp = change.direction === 'up';
          const isDown = change.direction === 'down';

          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 py-2 px-3 rounded-lg',
                isUp ? 'bg-success/5' : isDown ? 'bg-destructive/5' : 'bg-figma-hover'
              )}
            >
              <span className={cn(
                'text-figma-sm shrink-0',
                isUp ? 'text-figma-trend-up' : isDown ? 'text-figma-trend-down' : 'text-figma-muted'
              )}>
                {isUp ? '↑' : isDown ? '↓' : '→'}
              </span>
              <span className="text-figma-sm text-figma-primary flex-1">
                {change.message}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      {onViewTrends && (
        <div className="flex justify-end mt-3">
          <button
            onClick={onViewTrends}
            className="inline-flex items-center gap-0.5 text-figma-xs text-figma-blue hover:underline"
          >
            View all changes
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </ContentCard>
  );
}

export default WhatChangedCard;
