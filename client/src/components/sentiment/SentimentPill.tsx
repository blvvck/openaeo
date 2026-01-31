import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getSentimentCategory, getSentimentTextClass, getSentimentBgClass } from './types';

interface SentimentPillProps {
  /** The keyword/term */
  keyword: string;
  /** Sentiment score (-1 to 1) */
  score: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show score value */
  showScore?: boolean;
  /** Additional classes */
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1',
};

/**
 * Format score for display
 */
function formatScore(score: number): string {
  const sign = score > 0 ? '+' : '';
  return `${sign}${(score * 100).toFixed(0)}`;
}

/**
 * Get sentiment label
 */
function getSentimentLabel(score: number): string {
  if (score > 0.6) return 'Very Positive';
  if (score > 0.3) return 'Positive';
  if (score > -0.3) return 'Neutral';
  if (score > -0.6) return 'Negative';
  return 'Very Negative';
}

/**
 * SentimentPill - Keyword with sentiment badge
 *
 * Features:
 * - Keyword display with sentiment-coded color
 * - Score indicator
 * - Tooltip with sentiment label and score
 * - Multiple sizes
 * - Color coding: green (>0.3), gray (-0.3 to 0.3), red (<-0.3)
 */
export function SentimentPill({
  keyword,
  score,
  size = 'md',
  showScore = false,
  className,
}: SentimentPillProps) {
  const category = getSentimentCategory(score);
  const textClass = getSentimentTextClass(score);
  const bgClass = getSentimentBgClass(score);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full font-medium',
              bgClass,
              textClass,
              SIZE_CLASSES[size],
              className
            )}
          >
            {keyword}
            {showScore && (
              <span className="opacity-70 text-[0.85em]">
                {formatScore(score)}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <span className="font-medium">{getSentimentLabel(score)}</span>
            <span className="text-muted-foreground ml-2">
              Score: {(score * 100).toFixed(0)}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SentimentBadge - Badge variant with sentiment color
 */
export function SentimentBadge({
  keyword,
  score,
  className,
}: Omit<SentimentPillProps, 'size' | 'showScore'>) {
  const category = getSentimentCategory(score);

  const variantMap: Record<string, 'success' | 'secondary' | 'destructive'> = {
    positive: 'success',
    neutral: 'secondary',
    negative: 'destructive',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={variantMap[category]} className={className}>
            {keyword}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <span className="font-medium">{getSentimentLabel(score)}</span>
            <span className="text-muted-foreground ml-2">
              Score: {(score * 100).toFixed(0)}
            </span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SentimentPillGroup - Display multiple sentiment pills
 */
export function SentimentPillGroup({
  keywords,
  size = 'sm',
  maxItems,
  className,
}: {
  keywords: Array<{ keyword: string; score: number }>;
  size?: 'sm' | 'md' | 'lg';
  maxItems?: number;
  className?: string;
}) {
  const displayKeywords = maxItems ? keywords.slice(0, maxItems) : keywords;
  const remaining = maxItems ? keywords.length - maxItems : 0;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayKeywords.map((kw, index) => (
        <SentimentPill
          key={`${kw.keyword}-${index}`}
          keyword={kw.keyword}
          score={kw.score}
          size={size}
        />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground self-center ml-1">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
