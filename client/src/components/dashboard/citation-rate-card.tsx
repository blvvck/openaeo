import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { MetricCard } from '@/components/shared';
import { StatMetric, HoverArrow, CardSubtitle, CardDivider } from '@/components/shared';
import type { CategorizedCitationSources } from '@shared/types';
import { Info } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider,
} from '@/components/ui/tooltip';

// Colors for each category
const CATEGORY_COLORS = {
    owned: '#22C55E',    // green
    thirdParty: '#3B82F6', // blue
    social: '#8B5CF6',   // purple
};

interface CitationRateCardProps {
    rate: number;
    trend: number;
    sources: CategorizedCitationSources;
    onClick?: () => void;
    className?: string;
    noPeriodData?: boolean;
}

/**
 * Citation Rate Card (Card 3)
 * Shows citation rate with donut chart and categorized sources (Owned, Third-party, Social)
 */
// Default empty sources structure
const EMPTY_SOURCES: CategorizedCitationSources = {
    owned: { percentage: 0, count: 0, sites: [] },
    thirdParty: { percentage: 0, count: 0, sites: [] },
    social: { percentage: 0, count: 0, sites: [] },
};

export function CitationRateCard({
    rate,
    trend,
    sources,
    onClick,
    className,
    noPeriodData = false,
}: CitationRateCardProps) {
    // Use default if sources is undefined
    const safeSource = sources || EMPTY_SOURCES;

    // Build chart data from categorized sources
    const chartData = [
        { name: 'Owned', percentage: safeSource.owned.percentage, color: CATEGORY_COLORS.owned },
        { name: 'Third-party', percentage: safeSource.thirdParty.percentage, color: CATEGORY_COLORS.thirdParty },
        { name: 'Social', percentage: safeSource.social.percentage, color: CATEGORY_COLORS.social },
    ].filter(d => d.percentage > 0);

    const hasData = !noPeriodData && chartData.length > 0;
    const sourceGroups = [
        { label: 'Own', color: CATEGORY_COLORS.owned, percentage: safeSource.owned.percentage, sites: safeSource.owned.sites },
        { label: '3rd', color: CATEGORY_COLORS.thirdParty, percentage: safeSource.thirdParty.percentage, sites: safeSource.thirdParty.sites },
        { label: 'Social', color: CATEGORY_COLORS.social, percentage: safeSource.social.percentage, sites: safeSource.social.sites },
    ];

    return (
        <MetricCard onClick={onClick} className={className}>
            <HoverArrow />
            <div className="flex items-center">
                <span className="text-figma-xs font-normal text-figma-secondary">Citation rate</span>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="ml-1 text-figma-muted hover:text-figma-secondary transition-colors">
                                <Info className="w-3.5 h-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[200px] text-figma-2xs">
                            Percentage of AI responses that include a link to your site.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <StatMetric value={noPeriodData ? '—' : rate} trend={trend} valueSuffix="%" />

            <CardSubtitle>of responses cite you</CardSubtitle>

            <CardDivider />

            {/* Chart + Legend Row */}
            <div className="flex items-center gap-4">
                {/* Donut Chart */}
                <div className="w-[72px] h-[72px] shrink-0">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={22}
                                    outerRadius={36}
                                    paddingAngle={0}
                                    dataKey="percentage"
                                    stroke="none"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        // Empty donut ring
                        <div className="w-full h-full rounded-full border-[10px] border-figma-border-light" />
                    )}
                </div>

                <div className="flex flex-1 min-w-0 flex-col">
                    {noPeriodData ? (
                        <>
                            <div className="overflow-x-auto scrollbar-hover">
                                <div className="flex min-w-max gap-4">
                                    {sourceGroups.map((source) => (
                                        <div key={source.label} className="w-[72px] shrink-0">
                                            <div className="flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light whitespace-nowrap">
                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                                                <span className="text-figma-2xs font-medium text-figma-secondary">{source.label}</span>
                                                <span className="text-figma-2xs font-medium tabular-nums text-figma-muted ml-auto">—%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex min-h-[100px] items-center justify-center px-2 text-center text-figma-2xs text-figma-muted">
                                No results in this period
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 overflow-x-auto scrollbar-hover">
                            <div className="flex min-w-max gap-4">
                                {sourceGroups.map((source) => (
                                    <div key={source.label} className="w-[72px] shrink-0">
                                    <div className="flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light whitespace-nowrap">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                                        <span className="text-figma-2xs font-medium text-figma-secondary">{source.label}</span>
                                        <span className="text-figma-2xs font-medium tabular-nums text-figma-muted ml-auto">
                                            {hasData ? `${source.percentage}%` : '—%'}
                                        </span>
                                    </div>
                                    <div className="space-y-0.5">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <p key={index} className="text-figma-2xs text-figma-muted truncate">
                                                {source.sites[index] || '—'}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MetricCard>
    );
}

// Co-located skeleton - stays in sync with component structure
export function CitationRateCardSkeleton() {
    return (
        <MetricCard>
            {/* Label + info icon */}
            <div className="flex items-center gap-1">
                <span className="text-figma-xs font-normal text-figma-secondary">Citation rate</span>
                <div className="w-3.5 h-3.5 rounded-full bg-figma-border-light" />
            </div>

            {/* StatMetric placeholder */}
            <div className="h-[38px] flex items-center mt-2 mb-1">
                <div className="flex items-baseline gap-2">
                    <div className="h-7 w-14 bg-figma-border-light rounded animate-pulse" />
                    <div className="h-4 w-10 bg-figma-border-light rounded animate-pulse" />
                </div>
            </div>

            <CardSubtitle>of responses cite you</CardSubtitle>

            <CardDivider />

            {/* Donut + 3 columns */}
            <div className="flex items-center gap-4">
                <div className="w-[72px] h-[72px] rounded-full border-[10px] border-figma-border-light shrink-0" />
                <div className="flex-1 overflow-x-auto scrollbar-hover min-w-0">
                    <div className="flex gap-4 min-w-max">
                        {['Own', '3rd', 'Social'].map((label, idx) => (
                            <div key={label} className="w-[72px] shrink-0">
                                <div className="flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light whitespace-nowrap">
                                    <div className="w-1.5 h-1.5 rounded-full bg-figma-border-light shrink-0" />
                                    <span className="text-figma-2xs font-medium text-figma-secondary">{label}</span>
                                    <span className="text-figma-2xs font-medium tabular-nums text-figma-muted ml-auto">—%</span>
                                </div>
                                <div className="space-y-0.5">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-3.5 w-full bg-figma-border-light rounded animate-pulse" />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </MetricCard>
    );
}

export default CitationRateCard;
