import { Bot, Activity, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendIndicator } from '@/components/charts/trend-indicator';

interface BotStats {
  /** Total bot visits */
  totalVisits: number;
  /** AI bot visits specifically */
  aiBotVisits: number;
  /** Number of unique bot types detected */
  uniqueBots: number;
  /** Previous period values for trend calculation */
  previousPeriod?: {
    totalVisits: number;
    aiBotVisits: number;
    uniqueBots: number;
  };
}

interface BotStatsCardProps {
  /** Bot statistics */
  stats: BotStats;
  /** Time period label */
  periodLabel?: string;
  /** Card title */
  title?: string;
  /** Additional classes */
  className?: string;
}

interface StatItemProps {
  icon: typeof Bot;
  label: string;
  value: number;
  previousValue?: number;
  iconColor?: string;
}

function StatItem({
  icon: Icon,
  label,
  value,
  previousValue,
  iconColor = 'text-primary',
}: StatItemProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        'bg-muted',
      )}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {value.toLocaleString()}
          </span>
          {previousValue !== undefined && (
            <TrendIndicator value={value} previousValue={previousValue} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * BotStatsCard - Summary statistics for bot traffic
 *
 * Features:
 * - Total visits, AI bot visits, unique bots
 * - Optional trend indicators
 * - Period label
 */
export function BotStatsCard({
  stats,
  periodLabel = 'Last 7 days',
  title = 'Bot Traffic',
  className,
}: BotStatsCardProps) {
  const { totalVisits, aiBotVisits, uniqueBots, previousPeriod } = stats;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <StatItem
          icon={Activity}
          label="Total Visits"
          value={totalVisits}
          previousValue={previousPeriod?.totalVisits}
          iconColor="text-primary"
        />
        <StatItem
          icon={Bot}
          label="AI Bot Visits"
          value={aiBotVisits}
          previousValue={previousPeriod?.aiBotVisits}
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatItem
          icon={Users}
          label="Unique Bots"
          value={uniqueBots}
          previousValue={previousPeriod?.uniqueBots}
          iconColor="text-blue-600 dark:text-blue-400"
        />
      </CardContent>
    </Card>
  );
}

/**
 * Compact bot stats for inline/sidebar display
 */
export function CompactBotStats({
  stats,
  className,
}: {
  stats: BotStats;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-1.5">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium tabular-nums">
          {stats.totalVisits.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Bot className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-sm font-medium tabular-nums">
          {stats.aiBotVisits.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="text-sm font-medium tabular-nums">
          {stats.uniqueBots}
        </span>
      </div>
    </div>
  );
}

/**
 * AI bot ratio indicator
 */
export function AIBotRatio({
  total,
  aiBots,
  className,
}: {
  total: number;
  aiBots: number;
  className?: string;
}) {
  const ratio = total > 0 ? Math.round((aiBots / total) * 100) : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${ratio}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums w-12 text-right">
        {ratio}% AI
      </span>
    </div>
  );
}
