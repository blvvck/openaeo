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
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  X,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/divider';
import { ScrollArea } from '@/components/ui/scroll-container';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type Insight,
  type InsightType,
  type InsightSeverity,
  INSIGHT_TYPE_INFO,
  INSIGHT_SEVERITY_INFO,
} from './types';

interface InsightDetailModalProps {
  /** Insight to display */
  insight: Insight | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback when insight is dismissed */
  onDismiss?: (insight: Insight) => void;
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
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Recommended actions based on insight type
 */
function getRecommendedActions(insight: Insight): Array<{ label: string; description: string }> {
  const baseActions: Record<InsightType, Array<{ label: string; description: string }>> = {
    visibility: [
      { label: 'Review content strategy', description: 'Analyze which content performs best with AI platforms' },
      { label: 'Update metadata', description: 'Ensure your site has proper structured data and descriptions' },
      { label: 'Monitor competitors', description: 'Check what competitors are doing differently' },
    ],
    competitor: [
      { label: 'Analyze competitor content', description: 'Review their top-performing pages and topics' },
      { label: 'Identify gaps', description: 'Find topics where you can differentiate' },
      { label: 'Adjust strategy', description: 'Update your content calendar based on findings' },
    ],
    sentiment: [
      { label: 'Review negative mentions', description: 'Identify what triggers negative sentiment' },
      { label: 'Improve content tone', description: 'Adjust messaging to be more positive' },
      { label: 'Address issues', description: 'Fix any product or service issues mentioned' },
    ],
    opportunity: [
      { label: 'Create new content', description: 'Develop content for the identified opportunity' },
      { label: 'Optimize existing pages', description: 'Update relevant pages to capture the opportunity' },
      { label: 'Track progress', description: 'Set up monitoring for the new focus area' },
    ],
    citation: [
      { label: 'Verify source', description: 'Confirm the citation is accurate and positive' },
      { label: 'Build more citations', description: 'Create content that can be cited by AI platforms' },
      { label: 'Monitor citations', description: 'Track how often your sources are cited' },
    ],
  };

  return baseActions[insight.type] || [];
}

/**
 * InsightDetailModal - Full insight context in a dialog
 *
 * Features:
 * - Full insight details
 * - Related metrics/charts
 * - Recommended actions
 * - Dismiss button
 */
export function InsightDetailModal({
  insight,
  open,
  onClose,
  onDismiss,
  className,
}: InsightDetailModalProps) {
  if (!insight) return null;

  const TypeIcon = getTypeIcon(insight.type);
  const SeverityIcon = getSeverityIcon(insight.severity);
  const severityInfo = INSIGHT_SEVERITY_INFO[insight.severity];
  const typeInfo = INSIGHT_TYPE_INFO[insight.type];
  const recommendedActions = getRecommendedActions(insight);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn('max-w-lg max-h-[80vh]', className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', severityInfo.bgClass)}>
              <TypeIcon className={cn('w-5 h-5', severityInfo.textClass)} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant={
                    insight.severity === 'critical'
                      ? 'destructive'
                      : insight.severity === 'warning'
                      ? 'warning'
                      : 'secondary'
                  }
                >
                  <SeverityIcon className="w-3 h-3 mr-1" />
                  {severityInfo.label}
                </Badge>
                <Badge variant="outline">{typeInfo.label}</Badge>
              </div>
              <DialogTitle>{insight.title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-2">
            {insight.description}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Metrics */}
            {insight.metrics && insight.metrics.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Related Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  {insight.metrics.map((metric, index) => (
                    <div
                      key={index}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {metric.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">
                          {metric.value}
                        </span>
                        {metric.change !== undefined && (
                          <span
                            className={cn(
                              'flex items-center text-sm',
                              metric.changeDirection === 'up' && 'text-success',
                              metric.changeDirection === 'down' && 'text-destructive',
                              metric.changeDirection === 'stable' && 'text-muted-foreground'
                            )}
                          >
                            {metric.changeDirection === 'up' && (
                              <TrendingUp className="w-4 h-4 mr-0.5" />
                            )}
                            {metric.changeDirection === 'down' && (
                              <TrendingDown className="w-4 h-4 mr-0.5" />
                            )}
                            {metric.changeDirection === 'stable' && (
                              <Minus className="w-4 h-4 mr-0.5" />
                            )}
                            {metric.change > 0 ? '+' : ''}
                            {metric.change}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Recommended Actions */}
            <div>
              <h4 className="text-sm font-medium mb-3">Recommended Actions</h4>
              <div className="space-y-2">
                {recommendedActions.map((action, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional data */}
            {insight.data && Object.keys(insight.data).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Additional Details</h4>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(insight.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {/* Timestamp */}
            <div className="text-xs text-muted-foreground">
              Generated: {formatDate(insight.createdAt)}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {onDismiss && (
            <Button
              variant="outline"
              onClick={() => {
                onDismiss(insight);
                onClose();
              }}
            >
              <X className="w-4 h-4 mr-2" />
              Dismiss
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
