/**
 * Placeholder Card
 *
 * Shell card for sections that need new API data.
 * Shows correct title, subtitle, and empty state structure.
 * Will be filled in when Luna delivers the API fields.
 *
 * Used for: Top Prompts, Citation Sources, Sentiment Signal, Trending Topics
 */

import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PlaceholderCardProps {
  /** Card title (sentence case) */
  title: string;
  /** Card subtitle/description */
  subtitle: string;
  /** "View all" link text */
  viewAllLabel?: string;
  /** "View all" click handler */
  onViewAll?: () => void;
  /** Minimum height */
  minHeight?: string;
  /** Card content placeholder -- children */
  children?: React.ReactNode;
  /** Additional classes */
  className?: string;
}

export function PlaceholderCard({
  title,
  subtitle,
  viewAllLabel = 'View all',
  onViewAll,
  minHeight = 'min-h-[280px]',
  children,
  className,
}: PlaceholderCardProps) {
  return (
    <Card className={cn('flex flex-col', minHeight, className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{subtitle}</CardDescription>
          </div>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              {viewAllLabel}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Separator */}
      <div className="mx-6 border-b border-border" />

      <CardContent className="flex-1 p-6 flex items-center justify-center">
        {children || (
          <div className="text-center">
            <p className="text-sm text-muted-foreground/60">
              Coming soon
            </p>
            <p className="text-xs text-muted-foreground/40 mt-1">
              Data will appear here once available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Top Prompts placeholder (Card 6 / Row 3)
 */
export function TopPromptsPlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <PlaceholderCard
      title="Top prompts"
      subtitle="What's driving your mentions"
      viewAllLabel="View all"
      onViewAll={onClick}
      minHeight="min-h-[320px]"
    >
      <div className="w-full space-y-4">
        {[1, 2, 3, 4, 5].map(rank => (
          <div key={rank} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground shrink-0">
              {rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="h-3.5 bg-muted/60 rounded w-3/4" />
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-2.5 bg-muted/40 rounded w-16" />
                <div className="h-2.5 bg-muted/40 rounded w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PlaceholderCard>
  );
}

/**
 * Citation Sources placeholder (Card 8 / Row 4)
 */
export function CitationSourcesPlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <PlaceholderCard
      title="Citation sources"
      subtitle="What AI cites about you"
      viewAllLabel="View all"
      onViewAll={onClick}
      minHeight="min-h-[280px]"
    >
      <div className="w-full space-y-3">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground/60 font-medium uppercase tracking-wider px-1">
          <span>Source</span>
          <span className="text-right">Citations</span>
          <span className="text-right">Sentiment</span>
        </div>
        {/* Placeholder rows */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center px-1 py-1">
            <div className="h-3.5 bg-muted/50 rounded w-24" />
            <div className="h-3.5 bg-muted/40 rounded w-10 ml-auto" />
            <div className="h-3.5 bg-muted/40 rounded w-14 ml-auto" />
          </div>
        ))}
      </div>
    </PlaceholderCard>
  );
}

/**
 * Sentiment Signal placeholder (Card 9 / Row 4)
 */
export function SentimentSignalPlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <PlaceholderCard
      title="Sentiment signal"
      subtitle="How AI describes you"
      viewAllLabel="View all"
      onViewAll={onClick}
      minHeight="min-h-[280px]"
    >
      <div className="w-full flex items-start gap-6">
        {/* Donut placeholder */}
        <div className="w-20 h-20 rounded-full border-8 border-muted/60 shrink-0" />
        {/* Breakdown */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">Positive</span>
            <span className="text-sm text-muted-foreground/40">--%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">Neutral</span>
            <span className="text-sm text-muted-foreground/40">--%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground/60">Negative</span>
            <span className="text-sm text-muted-foreground/40">--%</span>
          </div>
        </div>
      </div>
    </PlaceholderCard>
  );
}

/**
 * Trending Topics placeholder (Card 10 / Row 5)
 */
export function TrendingTopicsPlaceholder({ onClick }: { onClick?: () => void }) {
  return (
    <PlaceholderCard
      title="Trending in your space"
      subtitle="Emerging opportunities"
      viewAllLabel="View all"
      onViewAll={onClick}
      minHeight="min-h-[260px]"
    >
      <div className="w-full space-y-3">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground/60 font-medium uppercase tracking-wider px-1">
          <span>Topic</span>
          <span className="text-right">Volume</span>
          <span className="text-right">Your rank</span>
        </div>
        {/* Placeholder rows */}
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="space-y-1.5 px-1">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-center">
              <div className="h-3.5 bg-muted/50 rounded w-28" />
              <div className="h-3.5 bg-muted/40 rounded w-12 ml-auto" />
              <div className="h-3.5 bg-muted/40 rounded w-8 ml-auto" />
            </div>
            {/* Mini sparkline placeholder */}
            <div className="h-4 bg-muted/30 rounded w-32" />
          </div>
        ))}
      </div>
    </PlaceholderCard>
  );
}

export default PlaceholderCard;
