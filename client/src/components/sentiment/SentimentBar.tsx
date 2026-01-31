import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { DURATION, EASE } from '@/lib/motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SentimentBarProps {
  /** Positive percentage (0-100) */
  positive: number;
  /** Neutral percentage (0-100) */
  neutral: number;
  /** Negative percentage (0-100) */
  negative: number;
  /** Height of the bar */
  height?: 'sm' | 'md' | 'lg';
  /** Show percentage labels */
  showLabels?: boolean;
  /** Animate on mount */
  animated?: boolean;
  /** Additional classes */
  className?: string;
}

const HEIGHT_CLASSES = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

/**
 * SentimentBar - Stacked horizontal bar showing sentiment distribution
 *
 * Features:
 * - Stacked horizontal bar: positive (green) | neutral (gray) | negative (red)
 * - Animated on mount
 * - Tooltips on hover showing exact percentages
 * - Multiple height variants
 * - Optional percentage labels
 */
export function SentimentBar({
  positive,
  neutral,
  negative,
  height = 'md',
  showLabels = false,
  animated = true,
  className,
}: SentimentBarProps) {
  const [mounted, setMounted] = useState(!animated);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setMounted(true), 50);
      return () => clearTimeout(timer);
    }
  }, [animated]);

  // Normalize to ensure they sum to 100
  const total = positive + neutral + negative;
  const normalizedPositive = total > 0 ? (positive / total) * 100 : 0;
  const normalizedNeutral = total > 0 ? (neutral / total) * 100 : 0;
  const normalizedNegative = total > 0 ? (negative / total) * 100 : 0;

  const segments = [
    {
      key: 'positive',
      value: normalizedPositive,
      color: 'bg-success',
      label: 'Positive',
    },
    {
      key: 'neutral',
      value: normalizedNeutral,
      color: 'bg-muted-foreground/40',
      label: 'Neutral',
    },
    {
      key: 'negative',
      value: normalizedNegative,
      color: 'bg-destructive',
      label: 'Negative',
    },
  ];

  return (
    <div className={cn('space-y-1', className)}>
      <TooltipProvider>
        <div
          className={cn(
            'flex w-full overflow-hidden rounded-full bg-muted',
            HEIGHT_CLASSES[height]
          )}
        >
          {segments.map((segment) => (
            <Tooltip key={segment.key}>
              <TooltipTrigger asChild>
                <motion.div
                  className={cn(
                    segment.color,
                    'h-full transition-colors',
                    segment.value > 0 && 'cursor-default'
                  )}
                  initial={{ width: 0 }}
                  animate={{
                    width: mounted ? `${segment.value}%` : 0,
                  }}
                  transition={{
                    duration: animated ? DURATION.slow : 0,
                    ease: EASE.outExpo,
                    delay: segment.key === 'neutral' ? 0.1 : segment.key === 'negative' ? 0.2 : 0,
                  }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <span className="font-medium">{segment.label}:</span>{' '}
                  {segment.value.toFixed(1)}%
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Optional labels */}
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-success">
            {normalizedPositive.toFixed(0)}% positive
          </span>
          <span className="text-muted-foreground">
            {normalizedNeutral.toFixed(0)}% neutral
          </span>
          <span className="text-destructive">
            {normalizedNegative.toFixed(0)}% negative
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact sentiment indicator for inline use
 */
export function MiniSentimentBar({
  positive,
  neutral,
  negative,
  className,
}: Omit<SentimentBarProps, 'height' | 'showLabels' | 'animated'>) {
  const total = positive + neutral + negative;
  const normalizedPositive = total > 0 ? (positive / total) * 100 : 0;
  const normalizedNeutral = total > 0 ? (neutral / total) * 100 : 0;
  const normalizedNegative = total > 0 ? (negative / total) * 100 : 0;

  return (
    <div className={cn('flex w-20 h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div
        className="bg-success h-full"
        style={{ width: `${normalizedPositive}%` }}
      />
      <div
        className="bg-muted-foreground/40 h-full"
        style={{ width: `${normalizedNeutral}%` }}
      />
      <div
        className="bg-destructive h-full"
        style={{ width: `${normalizedNegative}%` }}
      />
    </div>
  );
}
