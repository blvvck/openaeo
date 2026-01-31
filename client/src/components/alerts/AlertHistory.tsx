import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/expandable-section';
import { ListSkeleton } from '@/components/shared/skeleton-loader';
import { EmptyState } from '@/components/shared/empty-state';
import { useAlertHistory, useAcknowledgeAlert } from './useAlerts';
import {
  ALERT_RULE_TYPES,
  ALERT_SEVERITIES,
  type AlertHistoryEntry,
  type AlertSeverity,
} from './types';

interface AlertHistoryProps {
  /** Filter by rule ID */
  ruleId?: number;
  /** Number of entries to show */
  limit?: number;
  /** Show compact view */
  compact?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Get severity icon
 */
function SeverityIcon({
  severity,
  className,
}: {
  severity: AlertSeverity;
  className?: string;
}) {
  const info = ALERT_SEVERITIES[severity];
  const iconClass = cn('w-4 h-4', info?.color, className);

  switch (severity) {
    case 'critical':
      return <AlertTriangle className={iconClass} />;
    case 'warning':
      return <AlertTriangle className={iconClass} />;
    default:
      return <Bell className={iconClass} />;
  }
}

/**
 * Get severity badge variant
 */
function getSeverityVariant(
  severity: AlertSeverity
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'secondary';
    default:
      return 'outline';
  }
}

/**
 * AlertHistory - Display recent alert history
 *
 * Features:
 * - List of triggered alerts with timestamps
 * - Severity indicators
 * - Delivery status for each channel
 * - Acknowledge action
 * - Expandable details
 */
export function AlertHistory({
  ruleId,
  limit = 20,
  compact = false,
  className,
}: AlertHistoryProps) {
  const { data: history, isLoading, error } = useAlertHistory({ ruleId, limit });
  const acknowledgeMutation = useAcknowledgeAlert();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent alert activity</CardDescription>
        </CardHeader>
        <CardContent>
          <ListSkeleton items={compact ? 3 : 5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load history"
            description="There was an error loading alert history."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>Recent alert activity</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="No alerts yet"
            description="Alerts will appear here when triggered by your rules."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className={className}
    >
      <Card>
        <CardHeader>
          <CardTitle>Alert History</CardTitle>
          <CardDescription>
            {history.length} recent alert{history.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {history.map((entry) => (
              <AlertHistoryItem
                key={entry.id}
                entry={entry}
                compact={compact}
                onAcknowledge={() => acknowledgeMutation.mutate(entry.id)}
                isAcknowledging={acknowledgeMutation.isPending}
              />
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ===== Alert History Item =====

interface AlertHistoryItemProps {
  entry: AlertHistoryEntry;
  compact?: boolean;
  onAcknowledge?: () => void;
  isAcknowledging?: boolean;
}

function AlertHistoryItem({
  entry,
  compact = false,
  onAcknowledge,
  isAcknowledging,
}: AlertHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const typeInfo = ALERT_RULE_TYPES[entry.type];
  const severityInfo = ALERT_SEVERITIES[entry.severity];

  const timeAgo = formatDistanceToNow(new Date(entry.triggeredAt), {
    addSuffix: true,
  });

  const successfulDeliveries = entry.deliveredTo.filter((d) => d.success).length;
  const totalDeliveries = entry.deliveredTo.length;

  return (
    <motion.div variants={staggerItem}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div
          className={cn(
            'rounded-lg border p-4',
            !entry.acknowledged && 'border-l-4',
            !entry.acknowledged && entry.severity === 'critical' && 'border-l-red-500',
            !entry.acknowledged && entry.severity === 'warning' && 'border-l-yellow-500',
            !entry.acknowledged && entry.severity === 'info' && 'border-l-blue-500'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <SeverityIcon severity={entry.severity} className="mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{entry.ruleName}</p>
                  <Badge
                    variant={getSeverityVariant(entry.severity)}
                    className="text-xs"
                  >
                    {severityInfo?.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{entry.message}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo}
                  </span>
                  {totalDeliveries > 0 && (
                    <span className="flex items-center gap-1">
                      {successfulDeliveries === totalDeliveries ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <XCircle className="w-3 h-3 text-red-500" />
                      )}
                      {successfulDeliveries}/{totalDeliveries} delivered
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!entry.acknowledged && onAcknowledge && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAcknowledge}
                  disabled={isAcknowledging}
                >
                  {isAcknowledging ? 'Acking...' : 'Ack'}
                </Button>
              )}
              {entry.acknowledged && (
                <Badge variant="outline" className="text-xs text-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Acknowledged
                </Badge>
              )}
              {!compact && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          {/* Expanded Details */}
          {!compact && (
            <CollapsibleContent className="mt-4 pt-4 border-t">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Alert Type</p>
                  <p className="font-medium">
                    {typeInfo?.label || entry.type}
                  </p>
                </div>

                {entry.deliveredTo.length > 0 && (
                  <div>
                    <p className="text-muted-foreground mb-2">Delivery Status</p>
                    <div className="space-y-1">
                      {entry.deliveredTo.map((delivery, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded bg-muted/50"
                        >
                          <span>{delivery.channelName}</span>
                          {delivery.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">{delivery.error}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.acknowledgedAt && (
                  <div>
                    <p className="text-muted-foreground">Acknowledged</p>
                    <p>
                      {formatDistanceToNow(new Date(entry.acknowledgedAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </Collapsible>
    </motion.div>
  );
}

/**
 * Compact alert history for dashboard widgets
 */
export function AlertHistoryCompact({
  limit = 5,
  onViewAll,
  className,
}: {
  limit?: number;
  onViewAll?: () => void;
  className?: string;
}) {
  const { data: history, isLoading } = useAlertHistory({ limit });

  if (isLoading) {
    return <ListSkeleton items={3} hasAvatar={false} className={className} />;
  }

  const unacknowledgedCount = history?.filter((h) => !h.acknowledged).length || 0;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Recent Alerts</CardTitle>
          {onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll}>
              View All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!history || history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent alerts</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 3).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-2 text-sm"
              >
                <SeverityIcon severity={entry.severity} />
                <span className="flex-1 truncate">{entry.ruleName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.triggeredAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
            {unacknowledgedCount > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {unacknowledgedCount} unacknowledged
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
