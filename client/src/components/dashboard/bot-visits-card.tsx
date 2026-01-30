import { MetricCard } from '@/components/shared';
import { StatMetric, HoverArrow, CardSubtitle, CardDivider } from '@/components/shared';
import { PlatformRow } from '@/components/shared';
import { PLATFORMS } from '@/components/ui/platform-icon';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';

interface BotVisitsCardProps {
    total: string | number;
    trend: number;
    period?: string;
    bots: {
        id: string;
        name: string;
        percentage: number;
        count: string | number;
    }[];
    onClick?: () => void;
    className?: string;
    noPeriodData?: boolean;
}

/**
 * Bot Visits Card (Card 4)
 * Matched to Figma: Lighter font weights, proper alignment
 */
export function BotVisitsCard({
    total,
    trend,
    period = 'past 7 days',
    bots,
    onClick,
    className,
    noPeriodData = false,
}: BotVisitsCardProps) {
    return (
        <MetricCard onClick={onClick} className={className}>
            <HoverArrow />
            <div className="flex items-center">
                <span className="text-figma-xs font-normal text-figma-secondary">Bot visits</span>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="ml-1 text-figma-muted hover:text-figma-secondary transition-colors">
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-figma-2xs">
                            Number of times AI crawlers visited your site to index content.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <StatMetric value={noPeriodData ? '—' : total} trend={trend} />

            <CardSubtitle>{period}</CardSubtitle>

            <CardDivider />

            {/* Bot Rows - vertical scroll for overflow */}
            {noPeriodData ? (
                <div className="flex min-h-[100px] items-center justify-center px-2 text-center text-figma-2xs text-figma-muted">
                    No results in this period
                </div>
            ) : (
                <div className="max-h-[100px] overflow-y-auto scrollbar-none space-y-3">
                    {bots.length > 0 ? (
                        bots.map((bot) => (
                            <PlatformRow
                                key={bot.id}
                                platformId={bot.id}
                                name={bot.name}
                                iconSize="xs"
                                value={`${bot.percentage}%`}
                                secondaryValue={bot.count}
                            />
                        ))
                    ) : (
                        PLATFORMS.slice(0, 5).map((p) => (
                            <PlatformRow
                                key={p.id}
                                platformId={p.id}
                                name={p.name}
                                iconSize="sm"
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
export function BotVisitsCardSkeleton() {
    return (
        <MetricCard>
            {/* Label + info icon */}
            <div className="flex items-center gap-1">
                <span className="text-figma-xs font-normal text-figma-secondary">Bot visits</span>
                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
            </div>

            {/* StatMetric placeholder */}
            <div className="h-[38px] flex items-center mt-2 mb-1">
                <div className="flex items-baseline gap-2">
                    <div className="h-7 w-10 bg-figma-border-light rounded animate-pulse" />
                    <div className="h-4 w-10 bg-figma-border-light rounded animate-pulse" />
                </div>
            </div>

            <CardSubtitle>past 7 days</CardSubtitle>

            <CardDivider />

            {/* Bot rows */}
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

export default BotVisitsCard;
