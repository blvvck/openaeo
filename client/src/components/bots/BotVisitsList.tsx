import { Bot, Globe, Search, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-grid';

type BotCategory = 'ai' | 'search' | 'social' | 'other';

interface BotVisit {
  /** Unique identifier */
  id: string;
  /** Bot type/name */
  botType: string;
  /** Bot category */
  category: BotCategory;
  /** URL visited */
  url: string;
  /** Timestamp of visit */
  visitedAt: Date | string;
  /** User agent string */
  userAgent?: string;
}

interface BotVisitsListProps {
  /** List of bot visits */
  visits: BotVisit[];
  /** Card title */
  title?: string;
  /** Show user agent column */
  showUserAgent?: boolean;
  /** Maximum rows to display */
  maxRows?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional classes */
  className?: string;
}

const CATEGORY_CONFIG: Record<BotCategory, {
  icon: typeof Bot;
  color: string;
  label: string;
}> = {
  ai: {
    icon: Bot,
    color: 'text-green-600 dark:text-green-400',
    label: 'AI',
  },
  search: {
    icon: Search,
    color: 'text-blue-600 dark:text-blue-400',
    label: 'Search',
  },
  social: {
    icon: Share2,
    color: 'text-purple-600 dark:text-purple-400',
    label: 'Social',
  },
  other: {
    icon: Globe,
    color: 'text-muted-foreground',
    label: 'Other',
  },
};

/**
 * Format date for display
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format URL for display (truncate if needed)
 */
function formatUrl(url: string, maxLength = 40): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    if (path.length <= maxLength) return path;
    return path.slice(0, maxLength - 3) + '...';
  } catch {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + '...';
  }
}

/**
 * BotVisitsList - Table of recent bot visits
 *
 * Features:
 * - Bot type with category icon
 * - URL visited
 * - Relative timestamp
 * - Optional user agent
 */
export function BotVisitsList({
  visits,
  title = 'Recent Bot Visits',
  showUserAgent = false,
  maxRows,
  emptyMessage = 'No bot visits recorded',
  className,
}: BotVisitsListProps) {
  const displayVisits = maxRows ? visits.slice(0, maxRows) : visits;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">
            {visits.length} visit{visits.length !== 1 ? 's' : ''}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {displayVisits.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Bot</TableHead>
                <TableHead>URL</TableHead>
                {showUserAgent && <TableHead className="hidden lg:table-cell">User Agent</TableHead>}
                <TableHead className="w-[100px] text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayVisits.map((visit) => {
                const categoryConfig = CATEGORY_CONFIG[visit.category];
                const Icon = categoryConfig.icon;
                return (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={cn('w-4 h-4', categoryConfig.color)} />
                        <span className="font-medium text-sm">{visit.botType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatUrl(visit.url)}
                      </span>
                    </TableCell>
                    {showUserAgent && (
                      <TableCell className="hidden lg:table-cell">
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] block">
                          {visit.userAgent || '-'}
                        </span>
                      </TableCell>
                    )}
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(visit.visitedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {maxRows && visits.length > maxRows && (
          <div className="p-3 text-center border-t">
            <span className="text-sm text-muted-foreground">
              +{visits.length - maxRows} more visits
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact visit list for sidebar
 */
export function CompactBotVisits({
  visits,
  maxVisible = 5,
  className,
}: {
  visits: BotVisit[];
  maxVisible?: number;
  className?: string;
}) {
  const displayVisits = visits.slice(0, maxVisible);

  return (
    <div className={cn('space-y-2', className)}>
      {displayVisits.map((visit) => {
        const categoryConfig = CATEGORY_CONFIG[visit.category];
        const Icon = categoryConfig.icon;
        return (
          <div key={visit.id} className="flex items-center gap-2 text-sm">
            <Icon className={cn('w-3.5 h-3.5 flex-shrink-0', categoryConfig.color)} />
            <span className="font-medium truncate flex-1">{visit.botType}</span>
            <span className="text-muted-foreground text-xs">
              {formatDate(visit.visitedAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
