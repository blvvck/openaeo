import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ContentCard, SENTIMENT_COLORS } from '@/components/shared';
import { PlatformIcon } from '@/components/ui/platform-icon';

interface SentimentSignalCardProps {
    /** Trend percentage change */
    trend: number;
    /** Sentiment percentages */
    positive: number;
    neutral: number;
    negative: number;
    /** Total mentions count for legend context */
    totalMentions: number;
    /** Sample quote info */
    quote: {
        text: string;
        platform: string;
        date: string;
    };
    /** Per-platform sentiment lean */
    platformSentiment?: { id: string; sentiment: 'positive' | 'neutral' | 'negative'; percent?: number }[];
    /** Contextual subtitle from backend */
    subtitle?: string;
    /** Click handler for "View all" */
    onClick?: () => void;
    /** Additional classes */
    className?: string;
}

/** Chart color values — match figma tokens for Recharts (needs raw hex) */
const CHART_COLORS = {
    positive: SENTIMENT_COLORS.positive,
    neutral: SENTIMENT_COLORS.neutral,
    negative: SENTIMENT_COLORS.negative,
} as const;


export function SentimentSignalCard({
    positive,
    neutral,
    negative,
    quote,
    platformSentiment,
    subtitle,
    onClick,
    className,
}: SentimentSignalCardProps) {
    const data = [
        { name: 'Positive', value: positive, color: CHART_COLORS.positive },
        { name: 'Neutral', value: neutral, color: CHART_COLORS.neutral },
        { name: 'Negative', value: negative, color: CHART_COLORS.negative },
    ];

    // Check if we have any sentiment data
    const hasData = positive > 0 || neutral > 0 || negative > 0;

    // Columns sorted by value — highest sentiment first
    const sortedData = [...data].sort((a, b) => b.value - a.value);

    return (
        <ContentCard
            title="Sentiment signal"
            subtitle={subtitle || 'How AI describes you'}
            onAction={onClick}
            contentClassName="flex-1 flex flex-col pt-4 px-5 pb-3"
            className={className}
        >
            {/* Donut + Three-column sentiment breakdown */}
            <div className="flex items-start gap-5 pl-2">
                {/* Donut Chart with Center Text */}
                <div className="w-[110px] h-[110px] relative shrink-0">
                    {hasData ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={33}
                                    outerRadius={55}
                                    paddingAngle={0}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        // Empty donut ring when no data
                        <div className="w-full h-full rounded-full border-[12px] border-figma-border-light" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        {hasData ? (
                            (() => {
                                const dominant = positive >= neutral && positive >= negative
                                    ? { value: positive, color: CHART_COLORS.positive }
                                    : negative >= positive && negative >= neutral
                                        ? { value: negative, color: CHART_COLORS.negative }
                                        : { value: neutral, color: CHART_COLORS.neutral };
                                return <span className="text-[18px] font-bold leading-none" style={{ color: dominant.color }}>{dominant.value}%</span>;
                            })()
                        ) : (
                            <span className="text-figma-sm font-medium text-figma-muted">—</span>
                        )}
                    </div>
                </div>

                {/* Three sentiment columns */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex gap-4">
                        {sortedData.map((item, idx) => {
                            const sentimentKey = item.name.toLowerCase() as 'positive' | 'neutral' | 'negative';
                            const matchingPlatforms = (platformSentiment ?? []).filter(p => p.sentiment === sentimentKey);
                            return (
                                <div key={item.name} className="flex flex-1 min-w-0 overflow-hidden">
                                    {idx > 0 && <div className="w-px bg-figma-border-light shrink-0 mr-4" />}
                                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                        <div className="flex items-center gap-1.5 mb-2 min-w-0">
                                            <div
                                                className="w-2 h-2 rounded-full shrink-0"
                                                style={{ backgroundColor: item.color }}
                                            />
                                            <span className="text-figma-2xs font-semibold truncate" style={{ color: item.color }}>
                                                {item.name} ({hasData ? `${item.value}%` : '—%'})
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1.5 overflow-hidden">
                                            {hasData ? (
                                                matchingPlatforms.map(p => (
                                                    <div key={p.id} className="flex items-center gap-1.5 min-w-0">
                                                        <PlatformIcon platform={p.id} size="xs" className="shrink-0" />
                                                        <span className="text-figma-2xs text-figma-primary truncate min-w-0">
                                                            {p.id === 'ai_mode' ? 'AI Mode' : p.id === 'ai_overview' ? 'AI Overview' : p.id.charAt(0).toUpperCase() + p.id.slice(1)}
                                                        </span>
                                                        {p.percent != null && (
                                                            <span className="text-figma-2xs font-medium text-figma-secondary tabular-nums shrink-0">· {p.percent}%</span>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                // Empty state placeholder
                                                <span className="text-figma-2xs text-figma-muted">—</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="border-t border-figma-border-light my-4" />

            {/* Quote Section — bg container fills remaining card space */}
            <div className="bg-figma-hover rounded-lg p-4">
                <div className="flex gap-4 items-stretch">
                    <div className="w-[3px] shrink-0 rounded-sm my-0.5" style={{
                        backgroundColor: hasData
                            ? (positive >= neutral && positive >= negative
                                ? CHART_COLORS.positive
                                : negative >= positive && negative >= neutral
                                    ? CHART_COLORS.negative
                                    : CHART_COLORS.neutral)
                            : '#D1D5DB' // neutral gray for empty state
                    }} />
                    <div className="flex-1 min-w-0">
                        {hasData ? (
                            <>
                                <p className="text-figma-xs text-figma-primary leading-snug line-clamp-3">
                                    "{quote.text}"
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-figma-2xs text-figma-muted">— {quote.platform.toUpperCase()}, {quote.date}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-figma-xs text-figma-muted leading-snug">
                                    "Your AI mentions will appear here..."
                                </p>
                                <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-figma-2xs text-figma-muted">— Platform, Date</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </ContentCard>
    );
}

// Co-located skeleton - stays in sync with component structure
export function SentimentSignalCardSkeleton() {
    return (
        <ContentCard
            title="Sentiment signal"
            subtitle="How AI describes you"
            contentClassName="flex-1 flex flex-col pt-4 px-5 pb-3"
        >
            {/* Donut + Three-column sentiment breakdown */}
            <div className="flex items-start gap-5 pl-2">
                {/* Empty donut ring */}
                <div className="w-[110px] h-[110px] relative shrink-0">
                    <div className="w-full h-full rounded-full border-[12px] border-figma-border-light" />
                </div>

                {/* Three sentiment columns - gray placeholders */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex gap-4">
                        {[1, 2, 3].map((idx) => (
                            <div key={idx} className="flex flex-1 min-w-0 overflow-hidden">
                                {idx > 1 && <div className="w-px bg-figma-border-light shrink-0 mr-4" />}
                                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                                    <div className="flex items-center gap-1.5 mb-2 min-w-0">
                                        <div className="w-2 h-2 rounded-full shrink-0 bg-figma-border-light" />
                                        <div className="h-3 w-16 bg-figma-border-light rounded animate-pulse" />
                                    </div>
                                    <div className="flex flex-col gap-1.5 overflow-hidden">
                                        <div className="h-2.5 w-12 bg-figma-border-light rounded animate-pulse" />
                                        <div className="h-2.5 w-10 bg-figma-border-light rounded animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border-t border-figma-border-light my-4" />

            {/* Quote Section placeholder - gray bars */}
            <div className="bg-figma-hover rounded-lg p-4">
                <div className="flex gap-4 items-stretch">
                    <div className="w-[3px] shrink-0 rounded-sm my-0.5 bg-figma-border-light" />
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 w-full bg-figma-border-light rounded animate-pulse" />
                        <div className="h-3 w-3/4 bg-figma-border-light rounded animate-pulse" />
                        <div className="h-2.5 w-24 bg-figma-border-light rounded animate-pulse mt-1" />
                    </div>
                </div>
            </div>
        </ContentCard>
    );
}

export default SentimentSignalCard;
