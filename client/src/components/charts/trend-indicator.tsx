import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'stable';

interface TrendIndicatorProps {
  /** Current value */
  value: number;
  /** Previous value for comparison */
  previousValue?: number;
  /** Explicitly set trend direction */
  direction?: TrendDirection;
  /** Format for the value display */
  format?: 'percent' | 'number' | 'score';
  /** Show the actual change value */
  showChange?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

const SIZES = {
  sm: { icon: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' },
  md: { icon: 'w-4 h-4', text: 'text-sm', gap: 'gap-1' },
  lg: { icon: 'w-5 h-5', text: 'text-base', gap: 'gap-1.5' },
};

function calculateTrend(current: number, previous?: number): {
  direction: TrendDirection;
  change: number;
  percentChange: number;
} {
  if (previous === undefined || previous === 0) {
    return { direction: 'stable', change: 0, percentChange: 0 };
  }

  const change = current - previous;
  const percentChange = (change / previous) * 100;

  if (change > 0.5) {
    return { direction: 'up', change, percentChange };
  } else if (change < -0.5) {
    return { direction: 'down', change, percentChange };
  }

  return { direction: 'stable', change: 0, percentChange: 0 };
}

function formatValue(
  value: number,
  format: 'percent' | 'number' | 'score',
  showSign: boolean = false
): string {
  const sign = showSign && value > 0 ? '+' : '';

  switch (format) {
    case 'percent':
      return `${sign}${value.toFixed(1)}%`;
    case 'score':
      return `${sign}${Math.round(value)}`;
    case 'number':
    default:
      return `${sign}${value.toFixed(1)}`;
  }
}

export function TrendIndicator({
  value,
  previousValue,
  direction: explicitDirection,
  format = 'percent',
  showChange = true,
  size = 'md',
  className,
}: TrendIndicatorProps) {
  const trend = calculateTrend(value, previousValue);
  const direction = explicitDirection || trend.direction;
  const sizeConfig = SIZES[size];

  const config = {
    up: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    down: {
      icon: TrendingDown,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    stable: {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  }[direction];

  const Icon = config.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5',
        config.bgColor,
        sizeConfig.gap,
        className
      )}
    >
      <Icon className={cn(sizeConfig.icon, config.color)} />
      {showChange && (
        <span className={cn(sizeConfig.text, config.color, 'font-medium')}>
          {format === 'percent'
            ? formatValue(trend.percentChange, 'percent', true)
            : formatValue(trend.change, format, true)}
        </span>
      )}
    </div>
  );
}

/**
 * Compact trend indicator for inline use
 */
export function TrendArrow({
  direction,
  className,
}: {
  direction: TrendDirection;
  className?: string;
}) {
  const config = {
    up: { icon: TrendingUp, color: 'text-success' },
    down: { icon: TrendingDown, color: 'text-destructive' },
    stable: { icon: Minus, color: 'text-muted-foreground' },
  }[direction];

  const Icon = config.icon;

  return <Icon className={cn('w-4 h-4', config.color, className)} />;
}
