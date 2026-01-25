import { AlertCircle, AlertTriangle, Info, LightbulbIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Priority = 'high' | 'medium' | 'low' | 'info';

interface Recommendation {
  /** Unique identifier */
  id: string;
  /** Recommendation text */
  text: string;
  /** Priority level */
  priority: Priority;
  /** Category for grouping */
  category?: string;
}

interface AuditRecommendationsProps {
  /** List of recommendations */
  recommendations: Recommendation[];
  /** Card title */
  title?: string;
  /** Group by priority */
  groupByPriority?: boolean;
  /** Maximum recommendations to show before "show more" */
  maxVisible?: number;
  /** Additional classes */
  className?: string;
}

const PRIORITY_CONFIG: Record<Priority, {
  icon: typeof AlertCircle;
  label: string;
  color: string;
  bgColor: string;
}> = {
  high: {
    icon: AlertCircle,
    label: 'High Priority',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  medium: {
    icon: AlertTriangle,
    label: 'Medium Priority',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  low: {
    icon: LightbulbIcon,
    label: 'Low Priority',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  info: {
    icon: Info,
    label: 'Informational',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const PRIORITY_ORDER: Priority[] = ['high', 'medium', 'low', 'info'];

/**
 * Single recommendation item
 */
function RecommendationItem({
  recommendation,
  showPriorityIndicator = true,
}: {
  recommendation: Recommendation;
  showPriorityIndicator?: boolean;
}) {
  const config = PRIORITY_CONFIG[recommendation.priority];
  const Icon = config.icon;

  return (
    <li className="flex items-start gap-3 py-2">
      {showPriorityIndicator && (
        <div
          className={cn(
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5',
            config.bgColor,
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', config.color)} />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm">{recommendation.text}</p>
        {recommendation.category && (
          <span className="text-xs text-muted-foreground">
            {recommendation.category}
          </span>
        )}
      </div>
    </li>
  );
}

/**
 * AuditRecommendations - Display recommendations with priority indicators
 *
 * Features:
 * - Priority indicators (high/medium/low/info)
 * - Optional grouping by priority
 * - Category labels
 */
export function AuditRecommendations({
  recommendations,
  title = 'Recommendations',
  groupByPriority = false,
  maxVisible,
  className,
}: AuditRecommendationsProps) {
  const displayRecommendations = maxVisible
    ? recommendations.slice(0, maxVisible)
    : recommendations;
  const hasMore = maxVisible && recommendations.length > maxVisible;

  if (groupByPriority) {
    // Group recommendations by priority
    const grouped = PRIORITY_ORDER.reduce((acc, priority) => {
      const items = recommendations.filter((r) => r.priority === priority);
      if (items.length > 0) {
        acc.push({ priority, items });
      }
      return acc;
    }, [] as Array<{ priority: Priority; items: Recommendation[] }>);

    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.map(({ priority, items }) => {
            const config = PRIORITY_CONFIG[priority];
            return (
              <div key={priority}>
                <h4 className={cn('text-sm font-medium mb-2', config.color)}>
                  {config.label}
                </h4>
                <ul className="space-y-1">
                  {items.map((rec) => (
                    <RecommendationItem
                      key={rec.id}
                      recommendation={rec}
                      showPriorityIndicator={false}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {recommendations.length} suggestion{recommendations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {displayRecommendations.map((rec) => (
            <RecommendationItem key={rec.id} recommendation={rec} />
          ))}
        </ul>
        {hasMore && (
          <p className="text-sm text-muted-foreground mt-3 text-center">
            +{recommendations.length - maxVisible!} more recommendations
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact recommendation list for sidebar/inline use
 */
export function CompactRecommendations({
  recommendations,
  maxVisible = 3,
  className,
}: {
  recommendations: Recommendation[];
  maxVisible?: number;
  className?: string;
}) {
  const highPriority = recommendations.filter((r) => r.priority === 'high');
  const displayItems = highPriority.length > 0
    ? highPriority.slice(0, maxVisible)
    : recommendations.slice(0, maxVisible);

  return (
    <div className={cn('space-y-2', className)}>
      {displayItems.map((rec) => {
        const config = PRIORITY_CONFIG[rec.priority];
        const Icon = config.icon;
        return (
          <div key={rec.id} className="flex items-start gap-2">
            <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', config.color)} />
            <p className="text-sm text-muted-foreground line-clamp-2">
              {rec.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
