import { cn } from '@/lib/utils';
import { ContentCard, SENTIMENT_COLORS } from '@/components/shared';
import { PlatformIcon, PLATFORMS, getPlatformInfo } from '@/components/ui/platform-icon';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';

/** Sentiment key → bar color hex (Recharts / inline style needs raw hex) */
const BAR_COLORS: Record<string, string> = {
    positive: SENTIMENT_COLORS.positive,
    neutral: SENTIMENT_COLORS.neutral,
    negative: SENTIMENT_COLORS.negative,
};

interface PlatformData {
    id: string;
    name: string;
    score: number;
    mentions: number;
    citations: number;
    sentiment: 'positive' | 'neutral' | 'negative';
}

interface PlatformCoverageCardProps {
    platforms: PlatformData[];
    /** Contextual subtitle from backend, truncated with ellipsis */
    subtitle?: string;
    onClick?: () => void;
    onPlatformClick?: (id: string) => void;
    className?: string;
}


export function PlatformCoverageCard({
    platforms,
    subtitle,
    onClick,
    onPlatformClick,
    className,
}: PlatformCoverageCardProps) {
    const hasData = platforms.length > 0;
    const sortedPlatforms = hasData
        ? [...platforms].sort((a, b) => b.score - a.score)
        : null;

    // Empty state: show all platforms with "—" values
    const emptyPlatforms = PLATFORMS.map(p => ({
        id: p.id,
        name: p.name,
    }));

    return (
        <ContentCard
            title="LLM mentions"
            subtitle={subtitle || "Where you're visible"}
            onAction={onClick}
            contentClassName="flex-1 pt-5 px-5 pb-4 overflow-hidden"
            className={className}
        >
            <TooltipProvider delayDuration={0}>
                <div className="max-h-[240px] overflow-y-auto scrollbar-none space-y-6 pr-1">
                    {hasData ? (
                        // Real data
                        sortedPlatforms!.map((p) => {
                            const color = BAR_COLORS[p.sentiment];
                            return (
                                <Tooltip key={p.id}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="group flex items-center gap-4 cursor-pointer"
                                            onClick={() => onPlatformClick?.(p.id)}
                                        >
                                            <div className="flex items-center gap-2.5 w-[110px] shrink-0" title={p.name}>
                                                <PlatformIcon platform={p.id} size="sm" />
                                                <span className="text-figma-sm font-medium text-figma-primary truncate">
                                                    {p.name}
                                                </span>
                                            </div>

                                            <div className="flex-1 h-2 bg-figma-bar-track rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${p.score}%`,
                                                        backgroundColor: color
                                                    }}
                                                />
                                            </div>

                                            <div className="flex items-center gap-1 w-[70px] justify-end shrink-0">
                                                <span className="text-figma-xs font-medium text-figma-primary tabular-nums">
                                                    {p.score}%
                                                </span>
                                                <span className="text-figma-xs font-medium text-figma-muted tabular-nums">
                                                    · {p.mentions}
                                                </span>
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="p-0 border-none shadow-2xl bg-transparent rounded-xl overflow-hidden"
                                        sideOffset={-5}
                                    >
                                        <div className="bg-figma-card rounded-xl p-4 min-w-[210px] border border-figma-border shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <PlatformIcon platform={p.id} size="sm" />
                                                    <span className="text-figma-base font-semibold text-figma-primary">{p.name}</span>
                                                </div>
                                                <span className="text-figma-base font-semibold text-figma-green">{p.score}/100</span>
                                            </div>

                                            <div className="h-px bg-figma-border-light mb-3" />

                                            <div className="space-y-2.5">
                                                <div className="flex justify-between items-center text-figma-sm">
                                                    <span className="text-figma-secondary font-normal">Mentions</span>
                                                    <span className="font-medium text-figma-primary">{p.mentions}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-figma-sm">
                                                    <span className="text-figma-secondary font-normal">Citations</span>
                                                    <span className="font-medium text-figma-primary">{p.citations}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-figma-sm">
                                                    <span className="text-figma-secondary font-normal">Sentiment</span>
                                                    <span className={cn(
                                                        "font-medium",
                                                        p.sentiment === 'positive' ? 'text-figma-green' :
                                                            p.sentiment === 'neutral' ? 'text-figma-orange' : 'text-figma-red'
                                                    )}>
                                                        {p.sentiment.charAt(0).toUpperCase() + p.sentiment.slice(1)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="h-px bg-figma-border-light mt-3 mb-2.5" />
                                            <button
                                                onClick={() => onPlatformClick?.(p.id)}
                                                className="text-figma-xs font-medium text-figma-blue hover:underline w-full text-right bg-transparent"
                                            >
                                                View details →
                                            </button>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })
                    ) : (
                        // Empty state - show all platforms with "—"
                        emptyPlatforms.map((p) => (
                            <div
                                key={p.id}
                                className="group flex items-center gap-4"
                            >
                                <div className="flex items-center gap-2.5 w-[110px] shrink-0" title={p.name}>
                                    <PlatformIcon platform={p.id} size="sm" />
                                    <span className="text-figma-sm font-normal text-figma-primary truncate">
                                        {p.name}
                                    </span>
                                </div>

                                <div className="flex-1 h-2 bg-figma-bar-track rounded-full overflow-hidden">
                                    {/* Empty bar */}
                                </div>

                                <div className="flex items-center gap-1 w-[70px] justify-end shrink-0">
                                    <span className="text-figma-xs font-medium text-figma-muted tabular-nums">
                                        —%
                                    </span>
                                    <span className="text-figma-xs font-medium text-figma-muted tabular-nums">
                                        · —
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </TooltipProvider>
        </ContentCard>
    );
}

// Co-located skeleton - stays in sync with component structure
export function PlatformCoverageCardSkeleton() {
    return (
        <ContentCard
            title="LLM mentions"
            subtitle="Where you're visible"
            contentClassName="flex-1 pt-5 px-5 pb-4 overflow-hidden"
        >
            <div className="max-h-[240px] overflow-y-auto scrollbar-none space-y-6 pr-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                        {/* Platform name */}
                        <div className="flex items-center gap-2.5 w-[110px] shrink-0">
                            <div className="h-4 w-4 bg-figma-border-light rounded animate-pulse" />
                            <div className="h-3 w-16 bg-figma-border-light rounded animate-pulse" />
                        </div>
                        {/* Bar track */}
                        <div className="flex-1 h-2 bg-figma-bar-track rounded-full" />
                        {/* Score */}
                        <div className="flex items-center gap-1 w-[70px] justify-end shrink-0">
                            <span className="text-figma-xs font-medium text-figma-muted tabular-nums">—%</span>
                            <span className="text-figma-xs font-medium text-figma-muted tabular-nums">· —</span>
                        </div>
                    </div>
                ))}
            </div>
        </ContentCard>
    );
}

export default PlatformCoverageCard;
