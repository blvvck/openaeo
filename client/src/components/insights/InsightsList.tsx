import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, SortAsc, SortDesc, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/action-menu';
import { EmptyState } from '@/components/shared/empty-state';
import { ListSkeleton } from '@/components/shared/skeleton-loader';
import { InsightCard, CompactInsightCard } from './InsightCard';
import {
  type Insight,
  type InsightType,
  type InsightSeverity,
  INSIGHT_TYPE_INFO,
  INSIGHT_SEVERITY_INFO,
} from './types';

interface InsightsListProps {
  /** Insights data */
  insights: Insight[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when insight is selected */
  onSelectInsight?: (insight: Insight) => void;
  /** Callback when insight is dismissed */
  onDismissInsight?: (insight: Insight) => void;
  /** Show compact view */
  compact?: boolean;
  /** Maximum items to show */
  maxItems?: number;
  /** Card title */
  title?: string;
  /** Card description */
  description?: string;
  /** Additional classes */
  className?: string;
}

type SortField = 'date' | 'severity';
type SortOrder = 'asc' | 'desc';

/**
 * Get severity priority for sorting
 */
function getSeverityPriority(severity: InsightSeverity): number {
  const priorities: Record<InsightSeverity, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  };
  return priorities[severity];
}

/**
 * InsightsList - List of insight cards with filtering
 *
 * Features:
 * - List of InsightCards
 * - Filter by severity, type
 * - Sort by date, severity
 * - Empty state
 * - Loading state
 * - Compact mode
 */
export function InsightsList({
  insights,
  isLoading = false,
  error,
  onSelectInsight,
  onDismissInsight,
  compact = false,
  maxItems,
  title = 'Insights',
  description,
  className,
}: InsightsListProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<InsightType>>(
    new Set(Object.keys(INSIGHT_TYPE_INFO) as InsightType[])
  );
  const [selectedSeverities, setSelectedSeverities] = useState<Set<InsightSeverity>>(
    new Set(Object.keys(INSIGHT_SEVERITY_INFO) as InsightSeverity[])
  );
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAll, setShowAll] = useState(false);

  const toggleType = (type: InsightType) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
  };

  const toggleSeverity = (severity: InsightSeverity) => {
    const newSeverities = new Set(selectedSeverities);
    if (newSeverities.has(severity)) {
      newSeverities.delete(severity);
    } else {
      newSeverities.add(severity);
    }
    setSelectedSeverities(newSeverities);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Filter and sort insights
  const filteredInsights = useMemo(() => {
    let result = insights.filter(
      (insight) =>
        selectedTypes.has(insight.type) &&
        selectedSeverities.has(insight.severity) &&
        !insight.dismissedAt
    );

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === 'severity') {
        comparison = getSeverityPriority(a.severity) - getSeverityPriority(b.severity);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [insights, selectedTypes, selectedSeverities, sortField, sortOrder]);

  // Apply max items limit
  const displayedInsights = maxItems && !showAll
    ? filteredInsights.slice(0, maxItems)
    : filteredInsights;

  const activeFiltersCount =
    (Object.keys(INSIGHT_TYPE_INFO).length - selectedTypes.size) +
    (Object.keys(INSIGHT_SEVERITY_INFO).length - selectedSeverities.size);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ListSkeleton items={3} hasAvatar className="gap-3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Failed to load insights"
            description="There was an error loading insights. Please try again."
            primaryAction={{
              label: 'Retry',
              onClick: () => window.location.reload(),
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort(sortField === 'date' ? 'severity' : 'date')}
          >
            {sortOrder === 'desc' ? (
              <SortDesc className="w-4 h-4 mr-1" />
            ) : (
              <SortAsc className="w-4 h-4 mr-1" />
            )}
            {sortField === 'date' ? 'Date' : 'Severity'}
          </Button>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-1" />
                Filter
                {activeFiltersCount > 0 && (
                  <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1.5">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Type</DropdownMenuLabel>
              {(Object.keys(INSIGHT_TYPE_INFO) as InsightType[]).map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedTypes.has(type)}
                  onCheckedChange={() => toggleType(type)}
                >
                  {INSIGHT_TYPE_INFO[type].label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Severity</DropdownMenuLabel>
              {(Object.keys(INSIGHT_SEVERITY_INFO) as InsightSeverity[]).map(
                (severity) => (
                  <DropdownMenuCheckboxItem
                    key={severity}
                    checked={selectedSeverities.has(severity)}
                    onCheckedChange={() => toggleSeverity(severity)}
                  >
                    {INSIGHT_SEVERITY_INFO[severity].label}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {filteredInsights.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No insights"
            description={
              insights.length === 0
                ? 'Run more analyses to generate insights about your brand visibility.'
                : 'No insights match your current filters. Try adjusting the filters.'
            }
          />
        ) : (
          <>
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              <AnimatePresence mode="popLayout">
                {displayedInsights.map((insight) => (
                  <motion.div
                    key={insight.id}
                    variants={staggerItem}
                    layout
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {compact ? (
                      <CompactInsightCard
                        type={insight.type}
                        severity={insight.severity}
                        title={insight.title}
                        description={insight.description}
                        onClick={() => onSelectInsight?.(insight)}
                      />
                    ) : (
                      <InsightCard
                        type={insight.type}
                        severity={insight.severity}
                        title={insight.title}
                        description={insight.description}
                        metrics={insight.metrics}
                        action={
                          insight.action
                            ? {
                                label: insight.action.label,
                                onClick: () => onSelectInsight?.(insight),
                              }
                            : {
                                label: 'View Details',
                                onClick: () => onSelectInsight?.(insight),
                              }
                        }
                        onDismiss={
                          onDismissInsight
                            ? () => onDismissInsight(insight)
                            : undefined
                        }
                        data={insight.data}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Show more button */}
            {maxItems && filteredInsights.length > maxItems && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll
                    ? 'Show less'
                    : `Show ${filteredInsights.length - maxItems} more`}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
