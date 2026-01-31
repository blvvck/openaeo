

import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/action-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import { InsightBox, Skeleton } from '@/components/shared';
import type { CompetitorCompareResponse, CompetitorDetail } from '@shared/types';

interface HeadToHeadCardProps {
  compareData: CompetitorCompareResponse | undefined;
  isLoading: boolean;
  competitors: CompetitorDetail[];
  selectedCompetitorId: string | null;
  onCompetitorSelect: (id: string) => void;
  className?: string;
}

export function HeadToHeadCard({
  compareData,
  isLoading,
  competitors,
  selectedCompetitorId,
  onCompetitorSelect,
  className,
}: HeadToHeadCardProps) {
  const selectedCompetitor = competitors.find(c => c.id === selectedCompetitorId);

  return (
    <Card className={cn('flex flex-col border-figma-border rounded-xl bg-figma-card min-w-0 overflow-hidden', className)}>
      <CardHeader className="pb-3 pt-5 px-5 select-none">
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-figma-md font-semibold text-figma-primary leading-tight">
              Head-to-head comparison
            </span>
            <span className="text-figma-sm font-normal text-figma-secondary mt-0.5">
              Compare directly with a specific competitor
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {selectedCompetitor ? (
                  <>
                    <CompanyAvatar name={selectedCompetitor.name} size="xs" />
                    <span className="text-figma-sm">{selectedCompetitor.name}</span>
                  </>
                ) : (
                  <span className="text-figma-sm text-figma-muted">Select competitor</span>
                )}
                <ChevronDown className="w-4 h-4 text-figma-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {competitors.map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => onCompetitorSelect(c.id)}
                  className="gap-2"
                >
                  <CompanyAvatar name={c.name} size="xs" />
                  <span className="text-figma-sm">{c.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <div className="h-px bg-figma-border-light mx-5" />

      <CardContent className="pt-4 px-5 pb-4 flex-1">
        {isLoading ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_80px] gap-3 items-center">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-12 rounded ml-auto" />
                  <Skeleton className="h-4 w-12 rounded ml-auto" />
                  <Skeleton className="h-4 w-12 rounded ml-auto" />
                </div>
              ))}
            </div>
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-1.5 flex-1 rounded-full" />
                  <Skeleton className="h-3 w-8 rounded" />
                  <Skeleton className="h-3 w-8 rounded" />
                </div>
              ))}
            </div>
          </div>
        ) : compareData ? (
          <>
            {/* Comparison Header */}
            <div className="mb-4">
              <p className="text-figma-sm font-medium text-figma-primary">
                {compareData.you.name} vs {compareData.them.name}
              </p>
            </div>

            {/* Metrics Table */}
            <div className="space-y-0">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_80px_80px] gap-3 pb-2 border-b border-figma-border-light">
                <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
                  METRIC
                </span>
                <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
                  YOU
                </span>
                <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
                  THEM
                </span>
                <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
                  DIFF
                </span>
              </div>

              {/* Rows */}
              {compareData.metrics.map((m, idx) => (
                <div
                  key={m.metric}
                  className="grid grid-cols-[1fr_80px_80px_80px] gap-3 py-2 border-b border-figma-border-light last:border-0"
                >
                  <span className="text-figma-sm text-figma-primary">
                    {m.metric}
                  </span>
                  <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
                    {m.yourValue}
                  </span>
                  <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
                    {m.theirValue}
                  </span>
                  <span className={cn(
                    'text-figma-sm font-medium tabular-nums text-right',
                    m.isPositive ? 'text-figma-trend-up' : 'text-figma-trend-down'
                  )}>
                    {typeof m.difference === 'number'
                      ? (m.difference > 0 ? '+' : '') + m.difference
                      : m.difference
                    }
                  </span>
                </div>
              ))}
            </div>

            {/* Platform Sparkline Bars */}
            <div className="space-y-2 mt-4">
              {compareData.platformComparison.map(p => (
                <div key={p.platformId} className="flex items-center gap-3">
                  <PlatformIcon platform={p.platformId} size="xs" />
                  <span className="text-figma-2xs text-figma-secondary w-[80px] truncate">
                    {p.platformName}
                  </span>
                  <div className="flex-1 h-1.5 bg-figma-bar-track rounded-full relative">
                    {/* Your score bar */}
                    <div
                      className="absolute h-full bg-figma-blue rounded-full"
                      style={{ width: `${p.yourScore}%` }}
                    />
                    {/* Their score marker */}
                    <div
                      className="absolute h-3 w-0.5 bg-figma-primary -top-[3px] rounded-full"
                      style={{ left: `${p.theirScore}%` }}
                    />
                  </div>
                  <span className="text-figma-2xs text-figma-primary tabular-nums w-8 text-right">
                    {p.yourScore}
                  </span>
                  <span className="text-figma-2xs text-figma-muted tabular-nums w-8 text-right">
                    {p.theirScore}
                  </span>
                </div>
              ))}
            </div>

            {/* Insight */}
            <InsightBox message={compareData.insight} className="mt-4" />
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-figma-sm text-figma-muted">
              Select a competitor to compare
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HeadToHeadCard;
