import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared';
import { SentimentBadge } from '@/components/shared';
import { TableHeader } from '@/components/shared';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CitationSource {
    id: string;
    domain: string;
    count: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    /** Which LLM platforms cite this source */
    platforms?: string[];
}

interface CitationSourcesCardProps {
    /** List of top citation sources */
    sources: CitationSource[];
    /** Contextual subtitle from backend */
    subtitle?: string;
    /** Click handler for "View all" */
    onClick?: () => void;
    /** Additional classes */
    className?: string;
}

const TABLE_GRID = 'grid-cols-[1fr_auto_80px_80px]';


export function CitationSourcesCard({
    sources,
    subtitle,
    onClick,
    className,
}: CitationSourcesCardProps) {
    return (
        <ContentCard
            title="Citation sources"
            subtitle={subtitle || 'What AI cites about you'}
            onAction={onClick}
            contentClassName="flex-1 pt-3 px-5 pb-4"
            className={className}
        >
            <div className="w-full">
                {/* Table Headers */}
                <TableHeader
                    gridCols={TABLE_GRID}
                    columns={[
                        { label: 'SOURCE' },
                        { label: 'PLATFORMS' },
                        { label: 'CITATIONS', align: 'right' },
                        { label: 'SENTIMENT', align: 'right' },
                    ]}
                />

                {/* Table Rows with hover tooltips */}
                <TooltipProvider delayDuration={300}>
                    <div className="divide-y divide-figma-border-light">
                        {sources.length > 0 ? (
                            sources.map((source) => (
                                <Tooltip key={source.id}>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={cn(
                                                'grid gap-3 items-center py-2.5 px-2 hover:bg-figma-hover transition-colors cursor-pointer',
                                                TABLE_GRID,
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light shrink-0" />
                                                <span className="text-figma-sm font-medium text-figma-primary truncate">
                                                    {source.domain}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {(source.platforms ?? []).slice(0, 4).map((p) => (
                                                    <PlatformIcon key={p} platform={p} size="xs" />
                                                ))}
                                            </div>
                                            <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
                                                {source.count}
                                            </span>
                                            <div className="flex justify-end">
                                                <SentimentBadge sentiment={source.sentiment} />
                                            </div>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        className="p-0 border-none shadow-xl bg-transparent rounded-xl overflow-hidden"
                                    >
                                        <div className="bg-figma-card rounded-xl p-4 min-w-[220px] border border-figma-border shadow-lg">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-4 h-4 rounded-full bg-figma-border-light shrink-0" />
                                                <span className="text-figma-base font-semibold text-figma-primary">{source.domain}</span>
                                            </div>
                                            <div className="h-px bg-figma-border-light mb-3" />
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-figma-sm">
                                                    <span className="text-figma-secondary">Citations</span>
                                                    <span className="font-medium text-figma-primary">{source.count}</span>
                                                </div>
                                                <div className="flex justify-between text-figma-sm">
                                                    <span className="text-figma-secondary">Sentiment</span>
                                                    <SentimentBadge sentiment={source.sentiment} />
                                                </div>
                                                {(source.platforms ?? []).length > 0 && (
                                                    <div className="flex justify-between items-center text-figma-sm">
                                                        <span className="text-figma-secondary">Platforms</span>
                                                        <div className="flex items-center gap-1.5">
                                                            {(source.platforms ?? []).map((p) => (
                                                                <PlatformIcon key={p} platform={p} size="xs" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            ))
                        ) : (
                            // Empty state: show placeholder rows
                            ['Source 1', 'Source 2', 'Source 3', 'Source 4'].map((name) => (
                                <div
                                    key={name}
                                    className={cn(
                                        'grid gap-3 items-center py-2.5 px-2',
                                        TABLE_GRID,
                                    )}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light shrink-0" />
                                        <span className="text-figma-sm font-normal text-figma-primary truncate">
                                            {name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
                                        <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
                                    </div>
                                    <span className="text-figma-sm font-medium text-figma-muted tabular-nums text-right">
                                        —
                                    </span>
                                    <div className="flex justify-end">
                                        <span className="text-figma-2xs text-figma-muted">—</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </TooltipProvider>
            </div>
        </ContentCard>
    );
}

// Co-located skeleton - stays in sync with component structure
export function CitationSourcesCardSkeleton() {
    return (
        <ContentCard
            title="Citation sources"
            subtitle="What AI cites about you"
            contentClassName="flex-1 pt-3 px-5 pb-4"
        >
            <div className="w-full">
                {/* Table Headers */}
                <TableHeader
                    gridCols={TABLE_GRID}
                    columns={[
                        { label: 'SOURCE' },
                        { label: 'PLATFORMS' },
                        { label: 'CITATIONS', align: 'right' },
                        { label: 'SENTIMENT', align: 'right' },
                    ]}
                />

                {/* Skeleton Rows */}
                <div className="divide-y divide-figma-border-light">
                    {[1, 2, 3, 4].map(i => (
                        <div
                            key={i}
                            className={cn(
                                'grid gap-3 items-center py-2.5 px-2',
                                TABLE_GRID,
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light shrink-0" />
                                <div className="h-3 w-20 bg-figma-border-light rounded animate-pulse" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light animate-pulse" />
                                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light animate-pulse" />
                            </div>
                            <span className="text-figma-sm font-medium text-figma-muted tabular-nums text-right">—</span>
                            <div className="flex justify-end">
                                <span className="text-figma-2xs text-figma-muted">—</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ContentCard>
    );
}

export default CitationSourcesCard;
