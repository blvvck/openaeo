import { cn } from '@/lib/utils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';

interface CompetitorRank {
  rank: number;
  id?: string;
  name: string;
  score: number;
  trend: number;
  isYou: boolean;
  topPlatforms?: string[];
}

interface CompetitorLeaderboardProps {
  data: CompetitorRank[];
  onRowClick?: (competitor: CompetitorRank) => void;
  className?: string;
  isEmpty?: boolean;
  brandName?: string;
}

// Empty state shows placeholder rows - brand first, then competitors
// All ranks show "—" since we don't know actual rankings yet
const getEmptyStateData = (brandName: string): CompetitorRank[] => [
  { rank: 0, name: brandName, score: 0, trend: 0, isYou: true },
  { rank: 0, name: 'Competitor 1', score: 0, trend: 0, isYou: false },
  { rank: 0, name: 'Competitor 2', score: 0, trend: 0, isYou: false },
  { rank: 0, name: 'Competitor 3', score: 0, trend: 0, isYou: false },
  { rank: 0, name: 'Competitor 4', score: 0, trend: 0, isYou: false },
];

export function CompetitorLeaderboard({
  data,
  onRowClick,
  className,
  isEmpty = false,
  brandName = 'Your Brand',
}: CompetitorLeaderboardProps) {
  // For empty state, don't sort - keep brand first
  // For real data, sort by rank
  const displayData = isEmpty ? getEmptyStateData(brandName) : data;
  const sortedData = isEmpty ? displayData : [...displayData].sort((a, b) => a.rank - b.rank);

  return (
    <div className={cn("w-full h-full flex flex-col", className)}>
      {/* Table Header — Figma: all headers #6B7380 (secondary) */}
      <div className="grid grid-cols-[40px_1fr_150px_48px] gap-2 px-5 py-3 border-b border-figma-border-light">
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Rank
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Brand
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">
          Top platforms
        </span>
        <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">
          Score
        </span>
      </div>

      {/* Table Body */}
      <div className="max-h-[260px] overflow-y-auto scrollbar-none divide-y divide-[#F3F4F6]">
        {sortedData.map((competitor, idx) => (
          <button
            key={competitor.id || competitor.name}
            onClick={() => !isEmpty && onRowClick?.(competitor)}
            disabled={isEmpty}
            className={cn(
              "w-full grid grid-cols-[40px_1fr_150px_48px] gap-2 items-center px-5 py-2.5 text-left transition-colors",
              !competitor.isYou && "hover:bg-figma-hover",
              competitor.isYou && "bg-figma-blue-light hover:bg-figma-blue-light",
            )}
          >
            {/* Rank — Figma: 13px Medium, left-aligned */}
            <div className="flex justify-start pl-1">
              <span className="text-figma-sm font-medium text-figma-secondary tabular-nums">
                {isEmpty ? '#—' : competitor.rank}
              </span>
            </div>

            {/* Brand Name — Figma: 20px avatar circle + 13px name + optional "You" pill */}
            <div className="flex items-center gap-2 min-w-0">
              {isEmpty
                ? <div className="w-5 h-5 rounded-full shrink-0 bg-figma-hover" />
                : <CompanyAvatar name={competitor.name} />
              }
              <span className={`text-figma-sm truncate ${competitor.isYou ? "font-semibold text-figma-blue" : "font-normal text-figma-primary"}`}>
                {competitor.name}
              </span>
              {competitor.isYou && (
                <span className="text-[9px] leading-none font-medium text-figma-blue bg-white rounded px-1.5 py-1 shrink-0">
                  You
                </span>
              )}
            </div>

            {/* Top Platforms icons - only show when we have real data */}
            <div className="flex items-center gap-2">
              {!isEmpty && competitor.topPlatforms && competitor.topPlatforms.length > 0 ? (
                competitor.topPlatforms.slice(0, 3).map((pId) => (
                  <PlatformIcon key={pId} platform={pId} size="xs" />
                ))
              ) : (
                <span className="text-figma-2xs text-figma-muted">—</span>
              )}
            </div>

            {/* Score — Figma: 14px Medium */}
            <div className="text-right">
              <span className="text-figma-base font-medium text-figma-primary tabular-nums">
                {isEmpty ? '—' : competitor.score.toFixed(1)}
              </span>
            </div>
          </button>
        ))}
      </div>

    </div>
  );
}

// Co-located skeleton - stays in sync with component structure
export function CompetitorLeaderboardSkeleton() {
    return (
        <div className="w-full h-full flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_150px_48px] gap-2 px-5 py-3 border-b border-figma-border-light">
                <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">Rank</span>
                <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">Brand</span>
                <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal">Top platforms</span>
                <span className="text-figma-2xs font-medium text-figma-secondary tracking-normal text-right">Score</span>
            </div>

            {/* Skeleton Rows */}
            <div className="max-h-[260px] overflow-y-auto scrollbar-none divide-y divide-[#F3F4F6]">
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        className="w-full grid grid-cols-[40px_1fr_150px_48px] gap-2 items-center px-5 py-2.5"
                    >
                        {/* Rank */}
                        <div className="flex justify-start pl-1">
                            <span className="text-figma-sm font-medium text-figma-muted tabular-nums">#—</span>
                        </div>
                        {/* Brand */}
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full shrink-0 bg-figma-border-light animate-pulse" />
                            <div className="h-4 w-24 bg-figma-border-light rounded animate-pulse" />
                        </div>
                        {/* Platforms */}
                        <div className="flex items-center gap-2">
                            <span className="text-figma-2xs text-figma-muted">—</span>
                        </div>
                        {/* Score */}
                        <div className="text-right">
                            <span className="text-figma-base font-medium text-figma-muted tabular-nums">—</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CompetitorLeaderboard;
