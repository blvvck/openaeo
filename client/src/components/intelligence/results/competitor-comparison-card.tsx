/**
 * Competitor Comparison Card
 *
 * Table comparing the researched brand to selected competitors.
 */

import { cn } from '@/lib/utils';
import { ContentCard, SentimentBadge, TableHeader } from '@/components/shared';
import type { CompetitorResult } from '../types';

interface CompetitorComparisonCardProps {
  competitors: CompetitorResult[];
  className?: string;
}

export function CompetitorComparisonCard({
  competitors,
  className,
}: CompetitorComparisonCardProps) {
  return (
    <ContentCard
      title="Competitor comparison"
      subtitle="How this brand compares to selected competitors"
      className={className}
    >
      {/* Table Header */}
      <TableHeader
        gridCols="grid-cols-[1fr_60px_80px_80px_60px]"
        columns={[
          { label: 'BRAND' },
          { label: 'SCORE', align: 'right' },
          { label: 'MENTIONS', align: 'right' },
          { label: 'SENTIMENT', align: 'right' },
          { label: '\u0394 YOU', align: 'right' },
        ]}
      />

      {/* Table Rows */}
      <div className="divide-y divide-figma-border-light">
        {competitors.map((competitor) => (
          <div
            key={competitor.id}
            className={cn(
              'grid grid-cols-[1fr_60px_80px_80px_60px] gap-3 items-center py-2.5 px-2',
              competitor.isTarget && 'bg-figma-blue-light rounded-lg -mx-2 px-4'
            )}
          >
            {/* Brand */}
            <span
              className={cn(
                'text-figma-sm truncate',
                competitor.isTarget
                  ? 'font-semibold text-figma-primary'
                  : 'font-medium text-figma-primary'
              )}
            >
              {competitor.name}
              {competitor.isTarget && (
                <span className="text-figma-2xs text-figma-blue ml-2">(you)</span>
              )}
            </span>

            {/* Score */}
            <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
              {competitor.score}
            </span>

            {/* Mentions */}
            <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
              {competitor.mentions.toLocaleString()}
            </span>

            {/* Sentiment */}
            <div className="flex justify-end">
              <SentimentBadge sentiment={competitor.sentiment} />
            </div>

            {/* Delta vs target */}
            <span
              className={cn(
                'text-figma-sm font-medium tabular-nums text-right',
                competitor.isTarget
                  ? 'text-figma-muted'
                  : competitor.deltaVsTarget > 0
                    ? 'text-figma-trend-up'
                    : competitor.deltaVsTarget < 0
                      ? 'text-figma-trend-down'
                      : 'text-figma-muted'
              )}
            >
              {competitor.isTarget
                ? '--'
                : competitor.deltaVsTarget > 0
                  ? `+${competitor.deltaVsTarget}`
                  : competitor.deltaVsTarget}
            </span>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}
