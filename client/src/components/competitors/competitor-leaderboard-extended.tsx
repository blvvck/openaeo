

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MoreVertical, Trash2 } from 'lucide-react';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/action-menu';
import type { CompetitorDetail } from '@shared/types';
import { TablePagination } from '@/components/shared';

interface CompetitorLeaderboardExtendedProps {
  competitors: CompetitorDetail[];
  onRowClick?: (competitor: CompetitorDetail) => void;
  onDelete?: (competitor: CompetitorDetail) => void;
  className?: string;
}

export function CompetitorLeaderboardExtended({
  competitors,
  onRowClick,
  onDelete,
  className,
}: CompetitorLeaderboardExtendedProps) {
  const sortedData = [...competitors].sort((a, b) => a.rank - b.rank);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * pageSize;
  const pageData = sortedData.slice(offset, offset + pageSize);

  return (
    <div className={cn('w-full', className)}>
      {/* Table Header */}
      <div className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 px-5 py-3 border-b border-figma-border-light">
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Rank
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Brand
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          Share of answers
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          High-intent
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal pl-3">
          Top prompt
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Platforms
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          Score
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          Trend
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          Δ
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          {/* Actions column - no header text */}
        </span>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-figma-border-light">
        {pageData.map((competitor) => (
          <div
            key={competitor.id}
            onClick={() => !competitor.isYou && onRowClick?.(competitor)}
            className={cn(
              'w-full grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 items-center px-5 py-2.5 text-left transition-colors',
              !competitor.isYou && 'hover:bg-figma-hover cursor-pointer',
              competitor.isYou && 'bg-figma-blue-light'
            )}
          >
            {/* Rank */}
            <span className="text-figma-sm font-medium text-figma-secondary tabular-nums">
              {competitor.rank}
            </span>

            {/* Brand */}
            <div className="flex items-center gap-2 min-w-0">
              <CompanyAvatar name={competitor.name} domain={competitor.domain} />
              <span className={cn(
                'text-figma-sm truncate',
                competitor.isYou ? 'font-semibold text-figma-blue' : 'font-normal text-figma-primary'
              )}>
                {competitor.name}
              </span>
              {competitor.isYou && (
                <span className="text-[9px] leading-none font-medium text-figma-blue bg-white rounded px-1.5 py-1 shrink-0">
                  You
                </span>
              )}
            </div>

            {/* Share of Answer */}
            <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
              {competitor.shareOfAnswer != null ? `${competitor.shareOfAnswer.toFixed(1)}%` : '—'}
            </span>

            {/* High-Intent */}
            <span className="text-figma-sm text-figma-secondary tabular-nums text-right">
              {competitor.highIntent != null ? `${competitor.highIntent.toFixed(0)}%` : '—'}
            </span>

            {/* Top Prompt */}
            <span className="text-figma-2xs text-figma-secondary truncate pl-3">
              {competitor.topPrompt || '—'}
            </span>

            {/* Top Platforms */}
            <div className="flex items-center gap-1.5">
              {(competitor.topPlatforms || []).slice(0, 3).map((pId) => (
                <PlatformIcon key={pId} platform={pId} size="xs" />
              ))}
            </div>

            {/* Score */}
            <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
              {competitor.score.toFixed(1)}
            </span>

            {/* Trend */}
            <span className={cn(
              'text-figma-xs tabular-nums text-right',
              competitor.trend > 0 ? 'text-figma-trend-up' : competitor.trend < 0 ? 'text-figma-trend-down' : 'text-figma-muted'
            )}>
              {competitor.trend > 0 ? '+' : ''}{competitor.trend.toFixed(1)}%
            </span>

            {/* Rank Change */}
            <span className={cn(
              'text-figma-xs tabular-nums text-right',
              (competitor.rankChange ?? 0) > 0 ? 'text-figma-trend-up' : (competitor.rankChange ?? 0) < 0 ? 'text-figma-trend-down' : 'text-figma-muted'
            )}>
              {(competitor.rankChange ?? 0) > 0
                ? `▲${competitor.rankChange}`
                : (competitor.rankChange ?? 0) < 0
                  ? `▼${Math.abs(competitor.rankChange!)}`
                  : '—'
              }
            </span>

            {/* Actions Menu - only for non-brand rows */}
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              {!competitor.isYou && onDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-figma-border-light transition-colors">
                      <MoreVertical className="w-4 h-4 text-figma-muted" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => onDelete(competitor)}
                      className="text-figma-red focus:text-figma-red"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete competitor
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ))}
      </div>
      <TablePagination
        offset={offset}
        pageSize={pageSize}
        total={sortedData.length}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(totalPages, current + 1))}
      />
    </div>
  );
}

export default CompetitorLeaderboardExtended;
