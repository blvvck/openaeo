/**
 * Bot Traffic Chart
 *
 * Stacked area chart showing AI bot visits over time, colored by bot type.
 * Uses Recharts AreaChart with platform colors.
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartContainer } from '@/components/ui/data-visualization';
import { PlatformIcon, getPlatformColor, AI_BOTS, SEARCH_BOTS, SOCIAL_BOTS } from '@/components/ui/platform-icon';

// Get bot icon ID from constants
function botToIcon(botType: string): string | null {
  const aiBot = AI_BOTS.find(b => b.id === botType);
  if (aiBot) return aiBot.icon;
  const searchBot = SEARCH_BOTS.find(b => b.id === botType);
  if (searchBot) return searchBot.icon;
  const socialBot = SOCIAL_BOTS.find(b => b.id === botType);
  if (socialBot) return socialBot.icon;
  return null;
}

// Get bot color from constants - no hardcoding
function getBotColor(botType: string): string {
  const icon = botToIcon(botType);
  return icon ? getPlatformColor(icon) : '#6B7280';
}

interface BotStats {
  botType: string;
  visitCount: number;
  percentage?: number;
}

interface BotTrafficChartProps {
  bots: BotStats[];
  data: ChartDataPoint[];
  height?: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

function formatTimelineDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  label,
  isEmpty,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isEmpty?: boolean;
}) {
  if (!active) return null;

  if (isEmpty || (payload?.length && payload.every(entry => entry.value === 0))) {
    return (
      <div className="bg-figma-card border border-figma-border rounded-xl px-3 py-2 shadow-lg">
        <p className="text-figma-xs font-medium text-figma-primary mb-1">
          {label ? formatTimelineDate(label) : 'No bot traffic data yet'}
        </p>
        <p className="text-figma-2xs text-figma-muted">
          Bot traffic data will appear here after crawlers visit your site.
        </p>
      </div>
    );
  }

  if (!payload?.length) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);
  const displayLabel = label ? formatTimelineDate(label) : '';

  return (
    <div className="bg-figma-card border border-figma-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-figma-xs font-medium text-figma-primary mb-2">{displayLabel}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-figma-2xs text-figma-secondary">{entry.name}</span>
            </div>
            <span className="text-figma-2xs font-medium text-figma-primary tabular-nums">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-figma-border-light mt-2 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-figma-2xs text-figma-muted">Total</span>
          <span className="text-figma-xs font-semibold text-figma-primary tabular-nums">
            {total.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom legend component
 */
function CustomLegend({ bots }: { bots: BotStats[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
      {bots.map(bot => (
        <div key={bot.botType} className="flex items-center gap-1.5">
          <PlatformIcon platform={botToIcon(bot.botType) || 'grok'} size="xs" />
          <span className="text-figma-2xs text-figma-secondary">{bot.botType}</span>
        </div>
      ))}
    </div>
  );
}

export function BotTrafficChart({
  bots,
  data,
  height = 280,
  className,
}: BotTrafficChartProps) {
  const chartData = data;
  const hasVisits = chartData.some(point => bots.some(bot => Number(point[bot.botType]) > 0));
  const chartPoints = hasVisits
    ? chartData
    : chartData.map(point => ({ ...point, noDataHover: 2 }));
  const tickEvery = Math.max(1, Math.ceil((chartData.length - 1) / 11));
  const dateTicks = chartData
    .filter((_, index) => index % tickEvery === 0)
    .map(point => point.date);

  // Build chart config for ChartContainer
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    bots.forEach(bot => {
      config[bot.botType] = {
        label: bot.botType,
        color: getBotColor(bot.botType),
      };
    });
    return config;
  }, [bots]);

  // Sort bots by visit count for stacking order (largest at bottom)
  const sortedBots = useMemo(
    () => [...bots].sort((a, b) => b.visitCount - a.visitCount),
    [bots]
  );

  if (!bots.length || !chartData.length) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-figma-xs text-figma-muted">Bot traffic data will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartPoints}
            margin={{ top: 8, right: 40, left: 0, bottom: 8 }}
          >
            <defs>
              {sortedBots.map(bot => (
                <linearGradient
                  key={`fill-${bot.botType}`}
                  id={`fill-${bot.botType.replace(/[^a-zA-Z0-9]/g, '')}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={getBotColor(bot.botType)}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={getBotColor(bot.botType)}
                    stopOpacity={0.05}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--figma-border-light, #E8EAED)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              ticks={dateTicks}
              tickFormatter={formatTimelineDate}
              interval="preserveStartEnd"
              minTickGap={24}
              tickMargin={8}
              padding={{ left: 36, right: 36 }}
              tick={{ fontSize: 11, fill: 'var(--figma-muted, #9CA3B0)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--figma-border-light, #E8EAED)' }}
            />
            <YAxis
              width={40}
              tick={{ fontSize: 11, fill: 'var(--figma-muted, #9CA3B0)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value;
              }}
            />
            <Tooltip content={<CustomTooltip isEmpty={!hasVisits} />} />
            {!hasVisits && (
              <Line
                dataKey="noDataHover"
                stroke="transparent"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            )}
            {sortedBots.map(bot => (
              <Area
                key={bot.botType}
                type="monotone"
                dataKey={bot.botType}
                stackId="1"
                stroke={getBotColor(bot.botType)}
                fill={`url(#fill-${bot.botType.replace(/[^a-zA-Z0-9]/g, '')})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
      <CustomLegend bots={sortedBots} />
    </div>
  );
}

export default BotTrafficChart;
