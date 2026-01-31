import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Shared chart tooltip utilities and components
 */

export interface TooltipValue {
  label: string;
  value: number | string;
  format?: 'number' | 'percent' | 'score' | 'currency' | 'date';
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  previousValue?: number;
}

export interface TooltipProps {
  title?: string;
  subtitle?: string;
  values: TooltipValue[];
  className?: string;
}

/**
 * Format a value based on type
 */
export function formatTooltipValue(
  value: number | string,
  format?: TooltipValue['format']
): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'score':
      return Math.round(value).toString();
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value);
    case 'date':
      return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'number':
    default:
      if (Number.isInteger(value)) return value.toString();
      return value.toFixed(2);
  }
}

/**
 * Calculate change between current and previous value
 */
export function calculateChange(
  current: number,
  previous?: number
): { change: number; percentChange: number; direction: 'up' | 'down' | 'stable' } {
  if (previous === undefined || previous === 0) {
    return { change: 0, percentChange: 0, direction: 'stable' };
  }

  const change = current - previous;
  const percentChange = (change / previous) * 100;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (change > 0.5) direction = 'up';
  else if (change < -0.5) direction = 'down';

  return { change, percentChange, direction };
}

/**
 * Get trend icon component
 */
function TrendIcon({ direction, className }: { direction: 'up' | 'down' | 'stable'; className?: string }) {
  const iconClasses = cn('w-3 h-3', className);

  switch (direction) {
    case 'up':
      return <TrendingUp className={cn(iconClasses, 'text-success')} />;
    case 'down':
      return <TrendingDown className={cn(iconClasses, 'text-destructive')} />;
    default:
      return <Minus className={cn(iconClasses, 'text-muted-foreground')} />;
  }
}

/**
 * Rich tooltip content component
 */
export function ChartTooltipContent({
  title,
  subtitle,
  values,
  className,
}: TooltipProps) {
  return (
    <div
      className={cn(
        'bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]',
        className
      )}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="mb-2 pb-2 border-b border-border">
          {title && (
            <p className="font-medium text-foreground">{title}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}

      {/* Values */}
      <div className="space-y-1.5">
        {values.map((item, index) => {
          const formattedValue = formatTooltipValue(item.value, item.format);
          const changeInfo = item.previousValue !== undefined
            ? calculateChange(item.value as number, item.previousValue)
            : null;

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {item.color && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{formattedValue}</span>
                {(item.trend || changeInfo) && (
                  <TrendIcon direction={item.trend || changeInfo!.direction} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Comparison tooltip showing before/after
 */
export function ComparisonTooltipContent({
  title,
  current,
  previous,
  format = 'number',
  className,
}: {
  title: string;
  current: number;
  previous?: number;
  format?: TooltipValue['format'];
  className?: string;
}) {
  const changeInfo = calculateChange(current, previous);

  return (
    <div
      className={cn(
        'bg-popover border border-border rounded-lg p-3 shadow-lg',
        className
      )}
    >
      <p className="font-medium text-foreground mb-2">{title}</p>

      <div className="space-y-2">
        <div className="flex justify-between gap-4">
          <span className="text-sm text-muted-foreground">Current</span>
          <span className="text-sm font-medium">
            {formatTooltipValue(current, format)}
          </span>
        </div>

        {previous !== undefined && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-muted-foreground">Previous</span>
              <span className="text-sm text-muted-foreground">
                {formatTooltipValue(previous, format)}
              </span>
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center gap-4">
              <span className="text-sm text-muted-foreground">Change</span>
              <div className="flex items-center gap-1">
                <TrendIcon direction={changeInfo.direction} />
                <span
                  className={cn(
                    'text-sm font-medium',
                    changeInfo.direction === 'up' && 'text-success',
                    changeInfo.direction === 'down' && 'text-destructive'
                  )}
                >
                  {changeInfo.change > 0 ? '+' : ''}
                  {formatTooltipValue(changeInfo.change, format)}
                  <span className="text-xs ml-1">
                    ({changeInfo.percentChange > 0 ? '+' : ''}
                    {changeInfo.percentChange.toFixed(1)}%)
                  </span>
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Platform-specific tooltip
 */
export function PlatformTooltipContent({
  platform,
  data,
  className,
}: {
  platform: string;
  data: {
    visibilityScore?: number;
    mentionCount?: number;
    positionScore?: number;
    sentimentScore?: number;
    responseCount?: number;
  };
  className?: string;
}) {
  const values: TooltipValue[] = [];

  if (data.visibilityScore !== undefined) {
    values.push({ label: 'Visibility', value: data.visibilityScore, format: 'score' });
  }
  if (data.mentionCount !== undefined) {
    values.push({ label: 'Mentions', value: data.mentionCount, format: 'number' });
  }
  if (data.positionScore !== undefined) {
    values.push({ label: 'Position', value: data.positionScore, format: 'score' });
  }
  if (data.sentimentScore !== undefined) {
    values.push({
      label: 'Sentiment',
      value: data.sentimentScore > 0 ? `+${data.sentimentScore.toFixed(2)}` : data.sentimentScore.toFixed(2),
    });
  }
  if (data.responseCount !== undefined) {
    values.push({ label: 'Responses', value: data.responseCount, format: 'number' });
  }

  return (
    <ChartTooltipContent
      title={platform}
      values={values}
      className={className}
    />
  );
}

/**
 * Date-based timeline tooltip
 */
export function TimelineTooltipContent({
  date,
  values,
  comparisonDate,
  comparisonValues,
  className,
}: {
  date: string | Date;
  values: TooltipValue[];
  comparisonDate?: string | Date;
  comparisonValues?: TooltipValue[];
  className?: string;
}) {
  const formattedDate = typeof date === 'string'
    ? date
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const formattedCompDate = comparisonDate
    ? typeof comparisonDate === 'string'
      ? comparisonDate
      : comparisonDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      className={cn(
        'bg-popover border border-border rounded-lg p-3 shadow-lg',
        className
      )}
    >
      <p className="font-medium text-foreground mb-2">{formattedDate}</p>

      <div className="space-y-1.5">
        {values.map((item, index) => {
          const compValue = comparisonValues?.[index];
          const changeInfo = compValue && typeof item.value === 'number' && typeof compValue.value === 'number'
            ? calculateChange(item.value, compValue.value)
            : null;

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {item.color && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatTooltipValue(item.value, item.format)}
                </span>
                {changeInfo && (
                  <span
                    className={cn(
                      'text-xs',
                      changeInfo.direction === 'up' && 'text-success',
                      changeInfo.direction === 'down' && 'text-destructive'
                    )}
                  >
                    {changeInfo.direction === 'up' ? '↑' : changeInfo.direction === 'down' ? '↓' : ''}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {formattedCompDate && (
        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
          vs {formattedCompDate}
        </p>
      )}
    </div>
  );
}
