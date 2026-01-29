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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer } from '@/components/ui/data-visualization';
import { PlatformIcon, getPlatformColor, AI_BOTS, SEARCH_BOTS, SOCIAL_BOTS } from '@/components/ui/platform-icon';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/components/charts/time-range-selector';

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
  timeRange: TimeRange;
  height?: number;
  className?: string;
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

/**
 * Generate mock daily data for the chart
 * In production, this would come from an API endpoint
 */
function generateChartData(bots: BotStats[], timeRange: TimeRange): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const { from, to } = timeRange;

  // Calculate number of days
  const diffTime = Math.abs(to.getTime() - from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const numDays = Math.min(diffDays, 30); // Max 30 data points

  // Calculate daily average for each bot
  const dailyAverages: Record<string, number> = {};
  bots.forEach(bot => {
    dailyAverages[bot.botType] = Math.round(bot.visitCount / numDays);
  });

  // Generate data points with some variation
  for (let i = 0; i < numDays; i++) {
    const date = new Date(from);
    date.setDate(date.getDate() + i);

    const point: ChartDataPoint = {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };

    bots.forEach((bot, botIndex) => {
      const avg = dailyAverages[bot.botType];
      const variation = (((i + 1) * (botIndex + 3)) % 9 - 4) / 20;
      const value = Math.max(0, Math.round(avg * (1 + variation)));
      point[bot.botType] = value;
    });

    data.push(point);
  }

  return data;
}

/**
 * Custom tooltip component
 */
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="bg-figma-card border border-figma-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-figma-xs font-medium text-figma-primary mb-2">{label}</p>
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
  timeRange,
  height = 280,
  className,
}: BotTrafficChartProps) {
  // Generate chart data
  const chartData = useMemo(
    () => generateChartData(bots, timeRange),
    [bots, timeRange]
  );

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

  // Empty state with curvy dashed placeholder line
  if (!bots.length) {
    // Generate placeholder data for empty state (curvy wave pattern)
    const emptyData: ChartDataPoint[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const waveValue = 50 + Math.sin((i / 7) * Math.PI * 2) * 15;
      emptyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        placeholder: Math.round(waveValue),
      });
    }

    return (
      <div className={className}>
        <ChartContainer config={{}} className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={emptyData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--figma-border-light, #E8EAED)"
                strokeOpacity={0.6}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--figma-muted, #9CA3B0)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--figma-border-light, #E8EAED)' }}
              />
              <YAxis
                width={40}
                tick={{ fontSize: 11, fill: 'var(--figma-muted, #9CA3B0)' }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active }) =>
                  active ? (
                    <div className="bg-figma-card border border-figma-border rounded-xl px-3 py-2 shadow-lg">
                      <p className="text-figma-xs text-figma-muted">No data yet</p>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey="placeholder"
                stroke="#D1D5DB"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
        <div className="flex items-center justify-center mt-4">
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
            data={chartData}
            margin={{ top: 8, right: 16, left: 16, bottom: 8 }}
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
            <Tooltip content={<CustomTooltip />} />
            {sortedBots.map(bot => (
              <Area
                key={bot.botType}
                type="monotone"
                dataKey={bot.botType}
                stackId="1"
                stroke={getBotColor(bot.botType)}
                fill={`url(#fill-${bot.botType.replace(/[^a-zA-Z0-9]/g, '')})`}
                strokeWidth={2}
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
