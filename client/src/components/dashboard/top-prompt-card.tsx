import { MetricCard } from '@/components/shared';
import { HoverArrow, CardDivider } from '@/components/shared';
import { PlatformRow } from '@/components/shared';
import { cn } from '@/lib/utils';
import { PLATFORMS } from '@/components/ui/platform-icon';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';

interface TopPromptCardProps {
    prompt: string;
    mentionCount: number | string;
    mentionTrend: number;
    platforms: {
        id: string;
        percentage: number;
        count: number;
    }[];
    onClick?: () => void;
    className?: string;
    noPeriodData?: boolean;
}

/**
 * Top Prompt Card (Card 2)
 * Matched to Figma: Lighter font weights, proper alignment
 */
export function TopPromptCard({
    prompt,
    mentionCount,
    mentionTrend,
    platforms,
    onClick,
    className,
    noPeriodData = false,
}: TopPromptCardProps) {
    const trendSign = mentionTrend > 0 ? '+' : '';
    const isPositive = mentionTrend > 0;
    const isNeutral = mentionTrend === 0;

    // Determine trend color: positive=green, negative=red, neutral=muted
    const trendColor = isPositive
        ? 'text-figma-trend-up'
        : isNeutral
            ? 'text-figma-muted'
            : 'text-figma-trend-down';

    return (
        <MetricCard onClick={onClick} className={className}>
            <HoverArrow />
            <div className="flex items-center">
                <span className="text-figma-xs font-normal text-figma-secondary">Top prompt</span>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="ml-1 text-figma-muted hover:text-figma-secondary transition-colors">
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-figma-2xs">
                            The prompt that mentions your brand most frequently.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Prompt Text - taller to push subtitle down to align with other cards */}
            <div className="h-[48px] flex items-start mt-2 mb-1 overflow-hidden">
                <h3 className="text-figma-md font-semibold text-figma-primary leading-tight line-clamp-2">
                    {noPeriodData ? '—' : <>&ldquo;{prompt}&rdquo;</>}
                </h3>
            </div>

            {/* Subtitle - aligns with "of responses cite you" and "past 7 days" */}
            <div className="flex items-center gap-2">
                <span className="text-figma-2xs font-normal text-figma-muted">{noPeriodData ? '—' : mentionCount} mentions</span>
                <span className={cn("text-figma-2xs font-medium", trendColor)}>
                    {isNeutral ? '—%' : `${trendSign}${mentionTrend}%`}
                </span>
            </div>

            <CardDivider />

            {/* Platform Rows - vertical scroll for overflow */}
            {noPeriodData ? (
                <div className="flex min-h-[100px] items-center justify-center px-2 text-center text-figma-2xs text-figma-muted">
                    No results in this period
                </div>
            ) : (
                <div className="max-h-[100px] overflow-y-auto scrollbar-none space-y-3">
                    {platforms.length > 0 ? (
                        platforms.map((p) => (
                            <PlatformRow
                                key={p.id}
                                platformId={p.id}
                                value={`${p.percentage}%`}
                                secondaryValue={p.count}
                            />
                        ))
                    ) : (
                        PLATFORMS.slice(0, 5).map((p) => (
                            <PlatformRow
                                key={p.id}
                                platformId={p.id}
                                value="—%"
                                secondaryValue="—"
                                muted
                            />
                        ))
                    )}
                </div>
            )}
        </MetricCard>
    );
}

// Co-located skeleton - stays in sync with component structure
export function TopPromptCardSkeleton() {
    return (
        <MetricCard>
            {/* Label + info icon */}
            <div className="flex items-center gap-1">
                <span className="text-figma-xs font-normal text-figma-secondary">Top prompt</span>
                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
            </div>

            {/* Prompt text placeholder */}
            <div className="h-[48px] flex items-start mt-2 mb-1 overflow-hidden">
                <div className="space-y-2 w-full">
                    <div className="h-4 w-full bg-figma-border-light rounded animate-pulse" />
                    <div className="h-4 w-3/4 bg-figma-border-light rounded animate-pulse" />
                </div>
            </div>

            {/* Subtitle */}
            <div className="flex items-center gap-2">
                <div className="h-2.5 w-20 bg-figma-border-light rounded animate-pulse" />
                <div className="h-2.5 w-10 bg-figma-border-light rounded animate-pulse" />
            </div>

            <CardDivider />

            {/* Platform rows */}
            <div className="max-h-[100px] overflow-y-auto scrollbar-none space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-3.5 w-3.5 bg-figma-border-light rounded animate-pulse" />
                            <div className="h-3 w-16 bg-figma-border-light rounded animate-pulse" />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-3 w-8 bg-figma-border-light rounded animate-pulse" />
                            <div className="h-3 w-6 bg-figma-border-light rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </MetricCard>
    );
}

export default TopPromptCard;
