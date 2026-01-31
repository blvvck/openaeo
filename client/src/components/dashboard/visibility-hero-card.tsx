import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, Info } from 'lucide-react';
import { VisibilityScoreRing } from '@/components/charts/visibility-score-ring';
import { PlatformIcon, getPlatformInfo, PLATFORMS } from '@/components/ui/platform-icon';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';
import type { PlatformScore, CompetitorRank } from '@shared/types';

interface VisibilityHeroCardProps {
    score: number;
    previousScore: number;
    platforms: PlatformScore[];
    competitors: CompetitorRank[];
    isPending: boolean;
    /** Badge text like "#1 in market" — pass null to hide */
    rankBadge?: string | null;
    onClick?: () => void;
    className?: string;
}


export function VisibilityHeroCard({
    score,
    previousScore,
    platforms,
    competitors,
    isPending,
    rankBadge,
    onClick,
    className,
}: VisibilityHeroCardProps) {
    const scoreDiff = score - previousScore;
    const diffSign = scoreDiff > 0 ? '+' : '';
    const isPositive = scoreDiff > 0;

    const sortedPlatforms = [...platforms].sort((a, b) => b.score - a.score);

    return (
        <Card
            onClick={onClick}
            className={cn(
                "group cursor-pointer hover:shadow-md transition-all duration-200 border-figma-border rounded-xl bg-white min-w-0 overflow-hidden h-[260px]",
                className
            )}
        >
            <CardContent className="p-5 overflow-hidden h-full flex flex-col">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <span className="text-figma-base font-semibold text-figma-primary">
                            Visibility score
                        </span>
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="ml-1 text-figma-muted hover:text-figma-secondary transition-colors">
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[200px] text-figma-2xs">
                                    Measures how often AI platforms mention your brand.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex items-center">
                        {!isPending && rankBadge ? (
                            <div className="bg-figma-blue-light px-2.5 py-1 rounded-md flex items-center justify-center transition-all duration-200">
                                <span className="text-figma-2xs font-medium text-figma-blue leading-none">
                                    {rankBadge}
                                </span>
                            </div>
                        ) : !isPending && !rankBadge ? (
                            <span className="inline-flex text-figma-xs font-medium px-3 py-0.5 rounded-full bg-figma-hover text-figma-muted">
                                No data
                            </span>
                        ) : null}
                        <div className="w-0 opacity-0 group-hover:w-5 group-hover:opacity-100 transition-all duration-200 overflow-hidden flex items-center justify-end">
                            <ArrowUpRight className="w-4 h-4 text-figma-muted shrink-0" />
                        </div>
                    </div>
                </div>

                {/* Ring + Trend Row */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="shrink-0">
                        {isPending || (score === 0 && previousScore === 0) ? (
                            <div className="w-[104px] h-[104px] rounded-full border-[10px] border-figma-border-light flex items-center justify-center">
                                <span className="text-[32px] font-semibold text-figma-muted">—</span>
                            </div>
                        ) : (
                            <VisibilityScoreRing
                                score={score}
                                previousScore={previousScore}
                                platformScores={platforms.map(p => ({ platform: p.id, score: p.score }))}
                                size="figma"
                                showTrend={false}
                                label=""
                            />
                        )}
                    </div>

                    {/* Always show trend section, but with "—" when no data */}
                    <div className="flex flex-col">
                        {isPending || (score === 0 && previousScore === 0) ? (
                            <>
                                <span className="text-figma-base font-semibold text-figma-muted">
                                    —
                                </span>
                                <span className="text-figma-2xs font-normal text-figma-muted mt-0.5">
                                    vs last period
                                </span>
                            </>
                        ) : (
                            <>
                                <span className={cn(
                                    "text-figma-base font-semibold",
                                    isPositive ? "text-figma-trend-up" : "text-figma-trend-down"
                                )}>
                                    {diffSign}{scoreDiff}%
                                </span>
                                <span className="text-figma-2xs font-normal text-figma-muted mt-0.5">
                                    vs last period
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Separator — mt-auto pushes platforms to card bottom */}
                <div className="h-px bg-figma-border-light mt-auto mb-3" />

                {/* Platform Footer - constrained horizontal scroll */}
                <div className="w-full overflow-hidden">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
                        {(sortedPlatforms.length > 0 ? sortedPlatforms : PLATFORMS).map((p, idx, arr) => {
                            const hasData = sortedPlatforms.length > 0;
                            const platformScore = hasData ? (p as PlatformScore).score : null;
                            return (
                                <div key={p.id} className="flex items-center gap-1 shrink-0">
                                    <PlatformIcon platform={p.id} size="xs" />
                                    <span className={cn(
                                        "text-figma-2xs font-normal",
                                        hasData ? "text-figma-secondary" : "text-figma-muted"
                                    )}>
                                        {getPlatformInfo(p.id).name}
                                    </span>
                                    <span className={cn(
                                        "text-figma-2xs font-normal",
                                        hasData ? "text-figma-primary" : "text-figma-muted"
                                    )}>·</span>
                                    <span className={cn(
                                        "text-figma-2xs font-medium",
                                        hasData ? "text-figma-primary" : "text-figma-muted"
                                    )}>
                                        {platformScore != null ? platformScore : '—'}
                                    </span>
                                    {idx < arr.length - 1 && (
                                        <span className="text-figma-2xs font-normal text-figma-tertiary ml-2">|</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom separator — balances whitespace below platforms */}
                <div className="h-px bg-figma-border-light mt-3" />
            </CardContent>
        </Card>
    );
}

// Co-located skeleton - stays in sync with component structure
export function VisibilityHeroCardSkeleton() {
    return (
        <Card className="border-figma-border rounded-xl bg-white min-w-0 overflow-hidden h-[260px]">
            <CardContent className="p-5 overflow-hidden h-full flex flex-col">
                {/* Header: title + info icon + skeleton badge */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-figma-base font-semibold text-figma-primary">Visibility score</span>
                        <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
                    </div>
                    <div className="h-6 w-20 bg-figma-border-light rounded-md animate-pulse" />
                </div>

                {/* Ring + Trend */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-[104px] h-[104px] rounded-full border-[10px] border-figma-border-light shrink-0 flex items-center justify-center">
                        <span className="text-[32px] font-semibold text-figma-muted">—</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-figma-base font-semibold text-figma-muted">—</span>
                        <span className="text-figma-2xs font-normal text-figma-muted mt-0.5">vs last period</span>
                    </div>
                </div>

                {/* Separator */}
                <div className="h-px bg-figma-border-light mt-auto mb-3" />

                {/* Platform footer */}
                <div className="w-full overflow-hidden">
                    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
                        {PLATFORMS.map((p, idx, arr) => (
                            <div key={p.id} className="flex items-center gap-1 shrink-0">
                                <div className="h-3 w-3 bg-figma-border-light rounded animate-pulse" />
                                <div className="h-2.5 w-12 bg-figma-border-light rounded animate-pulse" />
                                <span className="text-figma-2xs text-figma-muted">·</span>
                                <div className="h-2.5 w-4 bg-figma-border-light rounded animate-pulse" />
                                {idx < arr.length - 1 && (
                                    <span className="text-figma-2xs font-normal text-figma-tertiary ml-2">|</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom separator */}
                <div className="h-px bg-figma-border-light mt-3" />
            </CardContent>
        </Card>
    );
}
