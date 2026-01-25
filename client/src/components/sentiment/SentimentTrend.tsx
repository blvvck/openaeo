import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { cn } from '@/lib/utils';
import { rechartsProps, chartColors } from '@/components/charts/chart-theme';
import { TimeRangeSelector, useTimeRange, type TimeRange } from '@/components/charts/time-range-selector';
import { type SentimentDataPoint } from './types';

interface SentimentTrendProps {
  /** Sentiment data over time */
  data: SentimentDataPoint[];
  /** Chart height */
  height?: number;
  /** Show gradient fill under line */
  showArea?: boolean;
  /** Show time range selector */
  showTimeRangeSelector?: boolean;
  /** Current time range */
  timeRange?: TimeRange;
  /** Time range change handler */
  onTimeRangeChange?: (range: TimeRange) => void;
  /** Additional classes */
  className?: string;
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format full date for tooltip
 */
function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get color based on sentiment score
 */
function getSentimentColor(score: number): string {
  if (score > 0.3) return 'hsl(var(--success))';
  if (score < -0.3) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted-foreground))';
}

/**
 * Custom tooltip for sentiment chart
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: SentimentDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const scoreColor = getSentimentColor(data.score);

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
      <p className="font-medium text-foreground mb-2">
        {formatFullDate(data.date)}
      </p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Sentiment</span>
          <span className="font-medium" style={{ color: scoreColor }}>
            {data.score > 0 ? '+' : ''}
            {(data.score * 100).toFixed(0)}
          </span>
        </div>
        {data.positive !== undefined && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Positive</span>
            <span className="text-success">{data.positive.toFixed(0)}%</span>
          </div>
        )}
        {data.negative !== undefined && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Negative</span>
            <span className="text-destructive">{data.negative.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SentimentTrend - Line chart showing sentiment over time
 *
 * Features:
 * - Recharts LineChart with sentiment score over time
 * - Reference line at 0 (neutral)
 * - Gradient fill (positive = green, negative = red)
 * - Time range selector
 * - Custom tooltip
 */
export function SentimentTrend({
  data,
  height = 300,
  showArea = true,
  showTimeRangeSelector = true,
  timeRange,
  onTimeRangeChange,
  className,
}: SentimentTrendProps) {
  const { range, setRange } = useTimeRange('30d');
  const currentRange = timeRange || range;

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  // Transform data for chart
  const chartData = data.map((d) => ({
    ...d,
    displayDate: formatDate(d.date),
    // Convert score to percentage for display (-100 to 100)
    scorePercent: d.score * 100,
  }));

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <div className={cn('w-full', className)}>
      {/* Time range selector */}
      {showTimeRangeSelector && (
        <div className="flex justify-end mb-4">
          <TimeRangeSelector
            value={currentRange}
            onChange={handleRangeChange}
            variant="buttons"
            presets={['7d', '30d', '90d']}
          />
        </div>
      )}

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={chartData}
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              {/* Gradient for positive values */}
              <linearGradient id="sentimentGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
              {/* Gradient for negative values */}
              <linearGradient id="sentimentGradientNegative" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid {...rechartsProps.cartesianGrid} />
            <XAxis
              dataKey="displayDate"
              {...rechartsProps.xAxis}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[-100, 100]}
              {...rechartsProps.yAxis}
              tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
            />

            {/* Reference line at 0 (neutral) */}
            <ReferenceLine
              y={0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            <Tooltip content={<CustomTooltip />} />

            {showArea ? (
              <Area
                type="monotone"
                dataKey="scorePercent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#sentimentGradientPositive)"
                animationDuration={1000}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="scorePercent"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
                animationDuration={1000}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Compact sentiment sparkline for inline use
 */
export function SentimentSparkline({
  data,
  width = 80,
  height = 24,
  className,
}: {
  data: SentimentDataPoint[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const chartData = data.map((d) => ({
    score: d.score * 100,
  }));

  // Calculate trend
  const lastScore = chartData[chartData.length - 1]?.score || 0;
  const firstScore = chartData[0]?.score || 0;
  const trendColor =
    lastScore > firstScore
      ? 'hsl(var(--success))'
      : lastScore < firstScore
      ? 'hsl(var(--destructive))'
      : 'hsl(var(--muted-foreground))';

  return (
    <div className={cn('inline-block', className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="score"
            stroke={trendColor}
            strokeWidth={1.5}
            dot={false}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={0.5} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
