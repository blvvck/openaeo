import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Globe, Eye, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { type Competitor, type TrendDirection, type CompetitorTrendPoint } from './types';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface CompetitorCardProps {
  /** Competitor name */
  name: string;
  /** Competitor domain */
  domain: string;
  /** Total mentions */
  mentions: number;
  /** Visibility score */
  visibility: number;
  /** Trend direction */
  trend: TrendDirection;
  /** Trend value (percentage change) */
  trendValue?: number;
  /** Trend data for sparkline */
  trendData?: CompetitorTrendPoint[];
  /** Is this the user's own brand */
  isOwn?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
}

/**
 * Get trend icon and color
 */
function getTrendConfig(direction: TrendDirection) {
  return {
    up: { icon: TrendingUp, color: 'text-success', bg: 'bg-success/10' },
    down: { icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10' },
    stable: { icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted' },
  }[direction];
}

/**
 * Mini sparkline for trend
 */
function MiniSparkline({
  data,
  trend,
}: {
  data: CompetitorTrendPoint[];
  trend: TrendDirection;
}) {
  if (!data || data.length < 2) return null;

  const color =
    trend === 'up'
      ? 'hsl(var(--success))'
      : trend === 'down'
      ? 'hsl(var(--destructive))'
      : 'hsl(var(--muted-foreground))';

  return (
    <div className="w-12 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * CompetitorCard - Mini card for sidebar/grid view
 *
 * Features:
 * - Compact layout for sidebar or grid
 * - Brand name and domain
 * - Key metrics (mentions, visibility)
 * - Trend indicator with sparkline
 * - Highlighted if own brand
 */
export function CompetitorCard({
  name,
  domain,
  mentions,
  visibility,
  trend,
  trendValue,
  trendData,
  isOwn = false,
  onClick,
  className,
}: CompetitorCardProps) {
  const trendConfig = getTrendConfig(trend);
  const TrendIcon = trendConfig.icon;

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        interactive
        className={cn(
          'cursor-pointer transition-shadow hover:shadow-md',
          isOwn && 'border-primary/50 bg-primary/5',
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Header: Name + Badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  'font-medium truncate',
                  isOwn && 'text-primary'
                )}>
                  {name}
                </h4>
                {isOwn && (
                  <Badge variant="default" className="text-xs px-1.5 py-0">
                    You
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Globe className="w-3 h-3" />
                <span className="truncate">{domain}</span>
              </div>
            </div>

            {/* Trend indicator */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      trendConfig.bg,
                      trendConfig.color
                    )}
                  >
                    <TrendIcon className="w-3 h-3" />
                    {trendValue !== undefined && (
                      <span>
                        {trendValue > 0 ? '+' : ''}
                        {trendValue.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {trend === 'up' && 'Trending up'}
                  {trend === 'down' && 'Trending down'}
                  {trend === 'stable' && 'Stable'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{mentions.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground">mentions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{visibility}%</span>
              <span className="text-xs text-muted-foreground">visibility</span>
            </div>
          </div>

          {/* Sparkline */}
          {trendData && trendData.length > 1 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="h-8">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={
                        trend === 'up'
                          ? 'hsl(var(--success))'
                          : trend === 'down'
                          ? 'hsl(var(--destructive))'
                          : 'hsl(var(--primary))'
                      }
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact competitor list item
 */
export function CompetitorListItem({
  name,
  domain,
  mentions,
  visibility,
  trend,
  trendValue,
  isOwn = false,
  onClick,
  className,
}: Omit<CompetitorCardProps, 'trendData'>) {
  const trendConfig = getTrendConfig(trend);
  const TrendIcon = trendConfig.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors',
        isOwn && 'bg-primary/5 hover:bg-primary/10',
        className
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', isOwn && 'text-primary')}>
            {name}
          </span>
          {isOwn && (
            <Badge variant="default" className="text-xs px-1 py-0">
              You
            </Badge>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{domain}</span>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{mentions}</span>
        <span className="font-medium">{visibility}%</span>
        <div className={cn('flex items-center', trendConfig.color)}>
          <TrendIcon className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}
