import { motion } from 'framer-motion';
import {
  Eye,
  Users,
  Heart,
  Lightbulb,
  Link,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronRight,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeInUp } from '@/lib/motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  type Insight,
  type InsightType,
  type InsightSeverity,
  type InsightMetric,
  INSIGHT_SEVERITY_INFO,
} from './types';

interface InsightCardProps {
  /** Insight type */
  type: InsightType;
  /** Severity level */
  severity: InsightSeverity;
  /** Insight title */
  title: string;
  /** Insight description */
  description: string;
  /** Related metrics */
  metrics?: InsightMetric[];
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Additional data */
  data?: Record<string, unknown>;
  /** Click handler for the card */
  onClick?: () => void;
  /** Additional classes */
  className?: string;
}

/**
 * Get icon component for insight type
 */
function getTypeIcon(type: InsightType) {
  const icons = {
    visibility: Eye,
    competitor: Users,
    sentiment: Heart,
    opportunity: Lightbulb,
    citation: Link,
  };
  return icons[type];
}

/**
 * Get icon for severity
 */
function getSeverityIcon(severity: InsightSeverity) {
  const icons = {
    info: Info,
    warning: AlertTriangle,
    critical: AlertCircle,
  };
  return icons[severity];
}

/**
 * Format date for display
 */
function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * InsightCard - Display an AI-generated insight
 *
 * Features:
 * - Severity badge (info/warning/critical)
 * - Type icon (visibility, competitor, sentiment, opportunity)
 * - Title and description
 * - Related metrics with change indicators
 * - Action button (View Details, Dismiss)
 * - Animated entrance
 */
export function InsightCard({
  type,
  severity,
  title,
  description,
  metrics,
  action,
  onDismiss,
  data,
  onClick,
  className,
}: InsightCardProps) {
  const TypeIcon = getTypeIcon(type);
  const SeverityIcon = getSeverityIcon(severity);
  const severityInfo = INSIGHT_SEVERITY_INFO[severity];

  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      whileHover={onClick ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-shadow',
          onClick && 'cursor-pointer hover:shadow-md',
          className
        )}
        onClick={onClick}
      >
        {/* Severity indicator bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: severityInfo.color }}
        />

        <CardContent className="p-4 pl-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded-md', severityInfo.bgClass)}>
                <TypeIcon className={cn('w-4 h-4', severityInfo.textClass)} />
              </div>
              <Badge
                variant={
                  severity === 'critical'
                    ? 'destructive'
                    : severity === 'warning'
                    ? 'warning'
                    : 'secondary'
                }
                className="text-xs"
              >
                <SeverityIcon className="w-3 h-3 mr-1" />
                {severityInfo.label}
              </Badge>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Title and description */}
          <h4 className="font-medium text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>

          {/* Metrics */}
          {metrics && metrics.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 text-sm bg-muted/50 px-2 py-1 rounded"
                >
                  <span className="text-muted-foreground">{metric.label}:</span>
                  <span className="font-medium">{metric.value}</span>
                  {metric.change !== undefined && (
                    <span
                      className={cn(
                        'flex items-center text-xs',
                        metric.changeDirection === 'up' && 'text-success',
                        metric.changeDirection === 'down' && 'text-destructive',
                        metric.changeDirection === 'stable' && 'text-muted-foreground'
                      )}
                    >
                      {metric.changeDirection === 'up' && (
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                      )}
                      {metric.changeDirection === 'down' && (
                        <TrendingDown className="w-3 h-3 mr-0.5" />
                      )}
                      {metric.changeDirection === 'stable' && (
                        <Minus className="w-3 h-3 mr-0.5" />
                      )}
                      {metric.change > 0 ? '+' : ''}
                      {metric.change}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action */}
          {action && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-auto font-medium text-primary hover:text-primary/80"
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
            >
              {action.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Compact insight for notifications/lists
 */
export function CompactInsightCard({
  type,
  severity,
  title,
  description,
  onClick,
  className,
}: Omit<InsightCardProps, 'metrics' | 'action' | 'onDismiss' | 'data'>) {
  const TypeIcon = getTypeIcon(type);
  const severityInfo = INSIGHT_SEVERITY_INFO[severity];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('p-1.5 rounded-md flex-shrink-0', severityInfo.bgClass)}>
        <TypeIcon className={cn('w-4 h-4', severityInfo.textClass)} />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="font-medium text-sm text-foreground truncate">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
}
