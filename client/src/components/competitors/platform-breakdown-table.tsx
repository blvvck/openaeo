

import { cn } from '@/lib/utils';
import { PlatformIcon, getPlatformInfo } from '@/components/ui/platform-icon';
import type { PlatformRanking } from '@shared/types';

interface PlatformBreakdownTableProps {
  platforms: PlatformRanking[];
  className?: string;
}

export function PlatformBreakdownTable({
  platforms,
  className,
}: PlatformBreakdownTableProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Table Header */}
      <div className="grid grid-cols-[120px_1fr_1fr_60px_80px] gap-3 px-2 pb-3 border-b border-figma-border-light">
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
          PLATFORM
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
          #1
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase">
          #2
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          YOU
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">
          GAP TO #1
        </span>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-figma-border-light">
        {platforms.map((platform) => {
          const leader = platform.rankings[0];
          const second = platform.rankings[1];
          const you = platform.rankings.find(r => r.isYou);
          const isLeader = you?.rank === 1;
          const gap = leader && you ? leader.score - you.score : 0;

          return (
            <div
              key={platform.platformId}
              className="grid grid-cols-[120px_1fr_1fr_60px_80px] gap-3 items-center py-2.5 px-2 hover:bg-figma-hover transition-colors"
            >
              {/* Platform */}
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform.platformId} size="sm" />
                <span className="text-figma-sm text-figma-primary truncate">
                  {platform.platformName}
                </span>
              </div>

              {/* #1 */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  'text-figma-sm font-medium truncate',
                  leader?.isYou ? 'text-figma-blue' : 'text-figma-primary'
                )}>
                  {leader?.competitorName || '--'}
                </span>
                <span className="text-figma-xs text-figma-muted tabular-nums shrink-0">
                  {leader?.score ?? '--'}
                </span>
              </div>

              {/* #2 */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn(
                  'text-figma-sm truncate',
                  second?.isYou ? 'text-figma-blue font-medium' : 'text-figma-secondary'
                )}>
                  {second?.competitorName || '--'}
                </span>
                <span className="text-figma-xs text-figma-muted tabular-nums shrink-0">
                  {second?.score ?? '--'}
                </span>
              </div>

              {/* Your score */}
              <span className={cn(
                'text-figma-sm font-medium tabular-nums text-right',
                isLeader ? 'text-figma-green' : 'text-figma-primary'
              )}>
                {you?.score ?? '--'}
              </span>

              {/* Gap */}
              <span className={cn(
                'text-figma-xs tabular-nums text-right',
                isLeader ? 'text-figma-green font-medium' : 'text-figma-trend-down'
              )}>
                {isLeader ? 'Leader!' : gap > 0 ? `-${gap} pts` : '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PlatformBreakdownTable;
