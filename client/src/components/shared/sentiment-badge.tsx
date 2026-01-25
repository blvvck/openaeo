import { cn } from '@/lib/utils';

type Sentiment = 'positive' | 'neutral' | 'mixed' | 'negative';

interface SentimentBadgeProps {
    sentiment: Sentiment;
    /** Override display label (defaults to capitalized sentiment) */
    label?: string;
    /** Additional classes */
    className?: string;
}

/** Sentiment → background + text color mapping (figma tokens) */
const SENTIMENT_STYLES: Record<Sentiment, string> = {
    positive: 'bg-green-50 text-figma-green',
    neutral: 'bg-amber-50 text-figma-orange',
    mixed: 'bg-amber-50 text-figma-orange', // Same as neutral
    negative: 'bg-red-50 text-figma-red',
};

/**
 * SentimentBadge — Colored pill for sentiment labels.
 *
 * Usage:
 *   <SentimentBadge sentiment="positive" />
 *   <SentimentBadge sentiment="neutral" />
 *   <SentimentBadge sentiment="negative" />
 */
export function SentimentBadge({ sentiment, label, className }: SentimentBadgeProps) {
    const displayLabel = label || sentiment.charAt(0).toUpperCase() + sentiment.slice(1);

    return (
        <span className={cn(
            'text-figma-2xs font-medium px-2 py-0.5 rounded',
            SENTIMENT_STYLES[sentiment],
            className,
        )}>
            {displayLabel}
        </span>
    );
}

// ============================================================================
// Sentiment color utilities (for charts / programmatic use)
// ============================================================================

/** Raw hex values for chart fills (Recharts needs hex, not CSS vars) */
export const SENTIMENT_COLORS = {
    positive: '#17A34A',
    neutral: '#9CA3B0',
    mixed: '#9CA3B0', // Same as neutral
    negative: '#DC2626',
} as const;

/** Tailwind text color classes for sentiment */
export const SENTIMENT_TEXT = {
    positive: 'text-figma-green',
    neutral: 'text-figma-muted',
    mixed: 'text-figma-muted', // Same as neutral
    negative: 'text-figma-red',
} as const;

export default SentimentBadge;
