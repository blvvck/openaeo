/**
 * RankBadge — Blue pill showing rank position
 *
 * Displays rank like "#1 of 5" or "#2 in market".
 * Used by Visibility Hero Card and Visibility page score card.
 */

import { cn } from '@/lib/utils';
import { formatRankBadge } from '@/lib/formatters';

interface RankBadgeProps {
  /** Current rank position (1-based) */
  rank: number | null;
  /** Total competitors */
  total: number;
  /** Custom label override (e.g., "#1 in market") */
  label?: string;
  /** Additional classes */
  className?: string;
}

export function RankBadge({ rank, total, label, className }: RankBadgeProps) {
  // Don't render if no valid rank
  if (rank === null || total === 0) return null;

  const displayText = label ?? formatRankBadge(rank, total);

  return (
    <div
      className={cn(
        'bg-figma-blue-light px-2.5 py-1 rounded-md flex items-center justify-center',
        className,
      )}
    >
      <span className="text-figma-2xs font-medium text-figma-blue leading-none">
        {displayText}
      </span>
    </div>
  );
}

export default RankBadge;
